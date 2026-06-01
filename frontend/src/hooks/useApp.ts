import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connectWallet, onWalletChange, type WalletConnection } from "../lib/wallet";
import { createMockBulletinClient, type BulletinClient } from "../lib/bulletin";
import {
  KEY_DERIVATION_MESSAGE,
  deriveEncryptionKeypair,
  encryptFor,
  type KeyPair,
} from "../lib/crypto";
import { POLKADOT_HUB, makeTx, randomHex, type TxRecord } from "../lib/chain";
import {
  ensureRegistered,
  sendDirectOnchain,
  sendToChannelOnchain,
  tipDirectOnchain,
  registerAliasOnchain,
  contextId,
} from "../lib/onchain";
import { sendAnonymousMail, relayConfigured } from "../lib/relay";
import { contractsDeployed } from "../contracts";
import type {
  ChatMessage,
  Conversation,
  Contact,
  ContextAlias,
  MailMessage,
  ViewKey,
  WalletAsset,
} from "../types";
import {
  seedConversations,
  seedMail,
  seedAssets,
  seedAliases,
  PEOPLE_ROOT,
  ME_FALLBACK,
} from "./demoData";

/**
 * Central app store. Holds wallet connection, the derived E2E keypair, the
 * simulated chain state (live block height + activity feed) and the three
 * product surfaces: messages, anonymous mail and wallet.
 */
export function useApp() {
  const [view, setView] = useState<ViewKey>("messages");
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keypair, setKeypair] = useState<KeyPair | null>(null);
  const [paranoid, setParanoid] = useState(true);

  const [conversations, setConversations] = useState<Conversation[]>(seedConversations);
  const [activeId, setActiveId] = useState<string>(seedConversations[0]?.id ?? "");
  const [mail, setMail] = useState<MailMessage[]>(seedMail);
  const [aliases, setAliases] = useState<ContextAlias[]>(seedAliases);
  const assets: WalletAsset[] = seedAssets;

  const [block, setBlock] = useState<number>(POLKADOT_HUB.genesisBlock);
  const [activity, setActivity] = useState<TxRecord[]>([]);

  const bulletin = useRef<BulletinClient>(createMockBulletinClient());

  const me: Contact = useMemo(
    () => ({
      address: wallet?.address ?? ME_FALLBACK.address,
      name: wallet ? "you" : ME_FALLBACK.name,
      personhood: true,
    }),
    [wallet],
  );

  const liveMode = contractsDeployed() && !!wallet;

  // Live block ticker at Polkadot's ~6s cadence.
  useEffect(() => {
    const id = setInterval(() => setBlock((b) => b + 1), POLKADOT_HUB.blockTimeMs);
    return () => clearInterval(id);
  }, []);

  useEffect(() => onWalletChange(() => void connect()), []);

  /** Push a pending tx, then finalize it against the current block height. */
  const simulateTx = useCallback(
    (method: string, contract: string): TxRecord => {
      const tx = makeTx(method, contract);
      setActivity((a) => [tx, ...a].slice(0, 40));
      const delay = 700 + Math.floor(Math.random() * 900);
      setTimeout(() => {
        setActivity((a) =>
          a.map((t) =>
            t.hash === tx.hash
              ? { ...t, status: "finalized", block: POLKADOT_HUB.genesisBlock }
              : t,
          ),
        );
      }, delay);
      // capture the block at finalize time
      setTimeout(() => {
        setActivity((a) => a.map((t) => (t.hash === tx.hash ? { ...t, block } : t)));
      }, delay + 1);
      return tx;
    },
    [block],
  );

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const conn = await connectWallet();
      setWallet(conn);
      const signature = await conn.signer.signMessage(KEY_DERIVATION_MESSAGE);
      const kp = deriveEncryptionKeypair(signature);
      setKeypair(kp);

      // Live mode: publish the encryption key on-chain if not registered yet.
      if (contractsDeployed()) {
        try {
          const did = await ensureRegistered(conn.signer, kp);
          if (did) simulateTx("IdentityRegistry.register", "IdentityRegistry");
        } catch (e) {
          console.warn("registration skipped:", e);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "connection failed");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    setKeypair(null);
  }, []);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  /** Start (or open) a direct conversation with an address or .dot-style name. */
  const startConversation = useCallback(
    (input: string): string | null => {
      const v = input.trim();
      if (!v) return null;
      const isAddr = /^0x[0-9a-fA-F]{40}$/.test(v);
      const address = isAddr ? v : `0x${randomHex(20).slice(2)}`;
      const name = isAddr ? `${v.slice(0, 6)}…${v.slice(-4)}` : v;

      const existing = conversations.find(
        (c) => c.kind === "dm" && (c.peer?.address === address || c.title === name),
      );
      if (existing) {
        setActiveId(existing.id);
        return existing.id;
      }
      const id = `dm-${randomHex(4).slice(2)}`;
      const convo: Conversation = {
        id,
        kind: "dm",
        title: name,
        peer: { address, name, personhood: false },
        messages: [],
      };
      setConversations((prev) => [convo, ...prev]);
      setActiveId(id);
      return id;
    },
    [conversations],
  );

  function patch(id: string, fn: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
  }

  /** Encrypt → store on Bulletin (CID) → simulate Messenger.sendDirect. */
  const sendMessage = useCallback(
    async (text: string, ttlSec?: number) => {
      if (!active || !text.trim()) return;
      const tempId = randomHex(6);
      const optimistic: ChatMessage = {
        id: tempId,
        from: me.address,
        text,
        sentAt: Date.now(),
        cid: "…",
        ttlSec,
        pending: true,
      };
      patch(active.id, (c) => ({ ...c, messages: [...c.messages, optimistic] }));
      try {
        let cid: string;
        let txHash: string;
        if (liveMode && wallet && keypair && active.kind === "dm" && active.peer) {
          // Real path: encrypt → Bulletin → Messenger.sendDirect on-chain.
          const r = await sendDirectOnchain(
            wallet.signer,
            bulletin.current,
            keypair,
            active.peer.address,
            text,
            ttlSec ?? 0,
          );
          cid = r.cid;
          txHash = r.txHash;
        } else if (liveMode && wallet && active.kind === "channel") {
          // Real path: encrypt to channel key → Bulletin → Messenger.sendToChannel.
          const r = await sendToChannelOnchain(
            wallet.signer,
            bulletin.current,
            contextId(`#${active.title}`),
            text,
            ttlSec ?? 0,
          );
          cid = r.cid;
          txHash = r.txHash;
        } else {
          // Demo path: real encryption + mock Bulletin + simulated tx.
          const recipientKey = keypair?.publicKey ?? new Uint8Array(32);
          const payload = encryptFor(text, recipientKey);
          cid = await bulletin.current.put(payload);
          const method = active.kind === "channel" ? "Messenger.sendToChannel" : "Messenger.sendDirect";
          txHash = simulateTx(method, "Messenger").hash;
        }
        patch(active.id, (c) => ({
          ...c,
          messages: c.messages.map((mm) =>
            mm.id === tempId ? { ...mm, cid, txHash, pending: false } : mm,
          ),
        }));
      } catch (e: any) {
        setError(e?.message ?? "send failed");
        patch(active.id, (c) => ({ ...c, messages: c.messages.filter((mm) => mm.id !== tempId) }));
      }
    },
    [active, keypair, me.address, simulateTx, liveMode, wallet],
  );

  /** Burn a message (Messenger.burn + drop Bulletin renewal). */
  const burnMessage = useCallback(
    (msgId: string) => {
      if (!active) return;
      simulateTx("Messenger.burn", "Messenger");
      patch(active.id, (c) => ({
        ...c,
        messages: c.messages.map((mm) =>
          mm.id === msgId ? { ...mm, burned: true, text: "", cid: "" } : mm,
        ),
      }));
    },
    [active, simulateTx],
  );

  /** Send an in-chat tip (Payments.tip). */
  const sendTip = useCallback(
    async (amount: string) => {
      if (!active) return;
      let txHash: string;
      try {
        if (liveMode && wallet && active.kind === "dm" && active.peer) {
          txHash = await tipDirectOnchain(wallet.signer, active.peer.address, amount);
        } else {
          txHash = simulateTx("Payments.tip", "Payments").hash;
        }
      } catch (e: any) {
        setError(e?.message ?? "tip failed");
        return;
      }
      const msg: ChatMessage = {
        id: randomHex(6),
        from: me.address,
        text: "",
        sentAt: Date.now(),
        cid: "—",
        txHash,
        tip: { amount, symbol: POLKADOT_HUB.symbol },
      };
      patch(active.id, (c) => ({ ...c, messages: [...c.messages, msg] }));
    },
    [active, me.address, simulateTx, liveMode, wallet],
  );

  /** Send an anonymous mail: sealed off-chain, relayed via Acurast TEE,
   *  delivered through AnonymousMail.deliver (no sender on-chain). */
  const sendMail = useCallback(
    async (subject: string, body: string, to = "", ttlSec = 1209600) => {
      let txHash = "";
      // Live path: seal to recipient key → Acurast TEE relay → AnonymousMail.deliver.
      if (liveMode && wallet && relayConfigured() && /^0x[0-9a-fA-F]{40}$/.test(to)) {
        try {
          await sendAnonymousMail(wallet.signer, to, subject, body, ttlSec);
        } catch (e: any) {
          setError(e?.message ?? "anonymous send failed");
          return;
        }
      } else {
        txHash = simulateTx("AnonymousMail.deliver", "AnonymousMail").hash;
      }
      const item: MailMessage = {
        id: randomHex(6),
        subject,
        body,
        receivedAt: Date.now(),
        cid: `bafy-mail-${randomHex(4).slice(2)}`,
        txHash,
        relay: `acu-proc:${randomHex(2).slice(2).toUpperCase()}…${randomHex(2).slice(2).toUpperCase()}`,
        ttlSec,
        read: true,
        outbound: true,
      };
      setMail((mm) => [item, ...mm]);
    },
    [simulateTx, liveMode, wallet],
  );

  const markMailRead = useCallback((id: string) => {
    setMail((mm) => mm.map((x) => (x.id === id ? { ...x, read: true } : x)));
  }, []);

  const burnMail = useCallback(
    (id: string) => {
      simulateTx("AnonymousMail.burn", "AnonymousMail");
      setMail((mm) => mm.map((x) => (x.id === id ? { ...x, burned: true, body: "", cid: "" } : x)));
    },
    [simulateTx],
  );

  /** Claim an unlinkable contextual alias for `context` (Individuality).
   *  Derives a fresh alias account + ring-VRF nullifier and registers it. */
  const claimAlias = useCallback(
    async (context: string, dim: 1 | 2 = 1) => {
      if (aliases.some((a) => a.context === context)) return; // one alias per context
      let alias = `0x${randomHex(2).slice(2)}…${randomHex(2).slice(2)}`;
      let nullifier = `0xnf:${randomHex(4).slice(2)}…${randomHex(4).slice(2)}`;
      let txHash: string;
      try {
        if (liveMode && wallet && keypair) {
          const r = await registerAliasOnchain(wallet.signer, keypair, context, dim);
          nullifier = `${r.nullifier.slice(0, 10)}…${r.nullifier.slice(-6)}`;
          alias = `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`;
          txHash = r.txHash;
        } else {
          txHash = simulateTx("Individuality.registerAlias", "Individuality").hash;
        }
      } catch (e: any) {
        setError(e?.message ?? "alias claim failed");
        return;
      }
      const item: ContextAlias = {
        id: randomHex(6),
        context,
        alias,
        nullifier,
        dim,
        since: Date.now(),
        txHash,
      };
      setAliases((a) => [item, ...a]);
    },
    [aliases, simulateTx, liveMode, wallet, keypair],
  );

  const revokeAlias = useCallback(
    (id: string) => {
      simulateTx("Individuality.revokeAlias", "Individuality");
      setAliases((a) => a.filter((x) => x.id !== id));
    },
    [simulateTx],
  );

  return {
    view,
    setView,
    wallet,
    me,
    connecting,
    error,
    keypair,
    liveMode,
    paranoid,
    setParanoid,
    block,
    activity,
    conversations,
    active,
    activeId,
    setActiveId,
    mail,
    assets,
    aliases,
    peopleRoot: PEOPLE_ROOT,
    connect,
    disconnect,
    startConversation,
    sendMessage,
    burnMessage,
    sendTip,
    sendMail,
    markMailRead,
    burnMail,
    claimAlias,
    revokeAlias,
  };
}

export type AppStore = ReturnType<typeof useApp>;
