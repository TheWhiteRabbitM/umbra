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
      setKeypair(deriveEncryptionKeypair(signature));
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
        const recipientKey = keypair?.publicKey ?? new Uint8Array(32);
        const payload = encryptFor(text, recipientKey);
        const cid = await bulletin.current.put(payload);
        const method = active.kind === "channel" ? "Messenger.sendToChannel" : "Messenger.sendDirect";
        const tx = simulateTx(method, "Messenger");
        patch(active.id, (c) => ({
          ...c,
          messages: c.messages.map((mm) =>
            mm.id === tempId ? { ...mm, cid, txHash: tx.hash, pending: false } : mm,
          ),
        }));
      } catch (e: any) {
        setError(e?.message ?? "send failed");
        patch(active.id, (c) => ({ ...c, messages: c.messages.filter((mm) => mm.id !== tempId) }));
      }
    },
    [active, keypair, me.address, simulateTx],
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
    (amount: string) => {
      if (!active) return;
      const tx = simulateTx("Payments.tip", "Payments");
      const msg: ChatMessage = {
        id: randomHex(6),
        from: me.address,
        text: "",
        sentAt: Date.now(),
        cid: "—",
        txHash: tx.hash,
        tip: { amount, symbol: POLKADOT_HUB.symbol },
      };
      patch(active.id, (c) => ({ ...c, messages: [...c.messages, msg] }));
    },
    [active, me.address, simulateTx],
  );

  /** Send an anonymous mail: sealed off-chain, relayed via Acurast TEE,
   *  delivered through AnonymousMail.deliver (no sender on-chain). */
  const sendMail = useCallback(
    (subject: string, body: string, ttlSec = 1209600) => {
      const tx = simulateTx("AnonymousMail.deliver", "AnonymousMail");
      const item: MailMessage = {
        id: randomHex(6),
        subject,
        body,
        receivedAt: Date.now(),
        cid: `bafy-mail-${randomHex(4).slice(2)}`,
        txHash: tx.hash,
        relay: `acu-proc:${randomHex(2).slice(2).toUpperCase()}…${randomHex(2).slice(2).toUpperCase()}`,
        ttlSec,
        read: true,
        outbound: true,
      };
      setMail((mm) => [item, ...mm]);
    },
    [simulateTx],
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
    (context: string, dim: 1 | 2 = 1) => {
      if (aliases.some((a) => a.context === context)) return; // one alias per context
      const tx = simulateTx("Individuality.registerAlias", "Individuality");
      const alias = `0x${randomHex(2).slice(2)}…${randomHex(2).slice(2)}`;
      const item: ContextAlias = {
        id: randomHex(6),
        context,
        alias,
        nullifier: `0xnf:${randomHex(4).slice(2)}…${randomHex(4).slice(2)}`,
        dim,
        since: Date.now(),
        txHash: tx.hash,
      };
      setAliases((a) => [item, ...a]);
    },
    [aliases, simulateTx],
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
