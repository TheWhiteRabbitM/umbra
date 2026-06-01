import {
  keccak256,
  toUtf8Bytes,
  concat,
  hexlify,
  getBytes,
  parseEther,
  type Signer,
  type Provider,
} from "ethers";
import nacl from "tweetnacl";
import {
  getIdentity,
  getMessenger,
  getPayments,
  getIndividuality,
} from "../contracts";
import {
  encryptFor,
  decryptWith,
  pubKeyToBytes32,
  bytes32ToPubKey,
  type EncryptedPayload,
  type KeyPair,
} from "./crypto";
import type { BulletinClient } from "./bulletin";

/**
 * Real on-chain integration (live mode).
 *
 * These are the genuine ethers.js calls behind Umbra's actions. They run when
 * the contracts are deployed (`contractsDeployed()`), encrypting client-side and
 * storing the ciphertext on the Bulletin Chain, with only the CID going on-chain.
 *
 * Self-readability: a direct message is sealed to the recipient's key AND, in a
 * `self` copy, to the sender's own key — so the sender can still read their own
 * history when reloading from chain events. Only the sender and recipient can
 * decrypt; the chain sees neither.
 */

/** Bulletin blob: the recipient-sealed payload plus a sender self-copy. */
type StoredMessage = EncryptedPayload & { self?: EncryptedPayload };

/** Publish the caller's encryption public key + profile CID if not already set. */
export async function ensureRegistered(
  signer: Signer,
  keypair: KeyPair,
  profileCid = "",
): Promise<boolean> {
  const id = getIdentity(signer);
  const me = await signer.getAddress();
  if (await id.isRegistered(me)) return false;
  const tx = await id.register(pubKeyToBytes32(keypair.publicKey), profileCid);
  await tx.wait();
  return true;
}

export async function isRegistered(runner: Signer | Provider, account: string): Promise<boolean> {
  return getIdentity(runner).isRegistered(account);
}

/** Encrypt → store on Bulletin → Messenger.sendDirect. Returns cid + tx hash. */
export async function sendDirectOnchain(
  signer: Signer,
  bulletin: BulletinClient,
  keypair: KeyPair,
  to: string,
  text: string,
  ttlSec = 0,
): Promise<{ cid: string; txHash: string }> {
  const id = getIdentity(signer);
  const recipientKeyHex: string = await id.encryptionKeyOf(to);
  const recipientKey = bytes32ToPubKey(recipientKeyHex);

  const blob: StoredMessage = encryptFor(text, recipientKey);
  blob.self = encryptFor(text, keypair.publicKey);

  const cid = await bulletin.put(blob as unknown as EncryptedPayload);
  const tx = await getMessenger(signer).sendDirect(to, cid, ttlSec);
  const rc = await tx.wait();
  return { cid, txHash: rc?.hash ?? tx.hash };
}

/** Burn a message early (sender only). */
export async function burnOnchain(
  signer: Signer,
  conversationId: string,
  index: number,
): Promise<string> {
  const tx = await getMessenger(signer).burn(conversationId, index);
  const rc = await tx.wait();
  return rc?.hash ?? tx.hash;
}

/** Pay a tip in the native token, linked to a conversation. */
export async function tipOnchain(
  signer: Signer,
  to: string,
  conversationId: string,
  amount: string,
  noteCid = "",
): Promise<string> {
  const tx = await getPayments(signer).tip(to, conversationId, noteCid, {
    value: parseEther(amount),
  });
  const rc = await tx.wait();
  return rc?.hash ?? tx.hash;
}

/** Tip a DM peer: derives the conversation id from the contract, then pays. */
export async function tipDirectOnchain(
  signer: Signer,
  peer: string,
  amount: string,
): Promise<string> {
  const me = await signer.getAddress();
  const convo: string = await getMessenger(signer).dmId(me, peer);
  return tipOnchain(signer, peer, convo, amount);
}

/** Hash a human context label to the bytes32 Individuality context. */
export const contextId = (label: string): string => keccak256(toUtf8Bytes(label));

/** Derive the deterministic ring-VRF-style nullifier for (person, context). */
export function deriveNullifier(keypair: KeyPair, context: string): string {
  return keccak256(concat([hexlify(keypair.secretKey), context]));
}

/** Register an unlinkable contextual alias for `contextLabel` (Individuality). */
export async function registerAliasOnchain(
  signer: Signer,
  keypair: KeyPair,
  contextLabel: string,
  dim: 1 | 2 = 1,
  proof = "0x",
): Promise<{ context: string; nullifier: string; txHash: string }> {
  const context = contextId(contextLabel);
  const nullifier = deriveNullifier(keypair, context);
  const tx = await getIndividuality(signer).registerAlias(context, nullifier, dim, proof);
  const rc = await tx.wait();
  return { context, nullifier, txHash: rc?.hash ?? tx.hash };
}

/**
 * Demo-grade group key for a channel: a shared keypair every member can derive
 * from the channel id. Lets channel posts stay encrypted-at-rest on Bulletin
 * while readable by members. (Production would use a ratcheting group scheme,
 * e.g. MLS — out of scope; documented in SECURITY.md.)
 */
function channelKeypair(channelId: string) {
  const seed = getBytes(keccak256(concat([toUtf8Bytes("umbra-channel"), channelId])));
  return nacl.box.keyPair.fromSecretKey(seed);
}

/** Create a channel on-chain. `label` is hashed to the channel/context id. */
export async function createChannelOnchain(
  signer: Signer,
  label: string,
  requiresPersonhood: boolean,
  minDim: 1 | 2 = 1,
  metadataCid = "",
): Promise<{ channel: string; txHash: string }> {
  const channel = contextId(label);
  const tx = await getMessenger(signer).createChannel(channel, requiresPersonhood, minDim, metadataCid);
  const rc = await tx.wait();
  return { channel, txHash: rc?.hash ?? tx.hash };
}

/** Post to a channel: encrypt to the channel key → Bulletin → sendToChannel. */
export async function sendToChannelOnchain(
  signer: Signer,
  bulletin: BulletinClient,
  channelId: string,
  text: string,
  ttlSec = 0,
): Promise<{ cid: string; txHash: string }> {
  const ck = channelKeypair(channelId);
  const cid = await bulletin.put(encryptFor(text, ck.publicKey));
  const tx = await getMessenger(signer).sendToChannel(channelId, cid, ttlSec);
  const rc = await tx.wait();
  return { cid, txHash: rc?.hash ?? tx.hash };
}

/**
 * Lightweight indexer: backfill a DM thread from `MessageSent` history, then
 * subscribe to new events live. Returns an unsubscribe function. This avoids
 * polling `getMessages` and is the basis for a production indexer/subscription.
 */
export async function watchDirectMessages(
  runner: Signer | Provider,
  me: string,
  peer: string,
  onEvent: (ev: { from: string; to: string; cid: string; expiresAt: number; index: number; txHash: string }) => void,
  fromBlock = 0,
): Promise<() => void> {
  const m = getMessenger(runner);
  const convo: string = await m.dmId(me, peer);
  const filter = m.filters.MessageSent(convo);

  const emit = (log: any) => {
    const a = log.args;
    onEvent({
      from: a.from,
      to: a.to,
      cid: a.cid,
      expiresAt: Number(a.expiresAt),
      index: Number(a.index),
      txHash: log.transactionHash ?? log.log?.transactionHash ?? "",
    });
  };

  // Backfill, then go live.
  const past = await m.queryFilter(filter, fromBlock);
  past.forEach(emit);
  await m.on(filter, (...args: any[]) => emit(args[args.length - 1]));

  return () => {
    m.off(filter);
  };
}

export interface LoadedMessage {
  from: string;
  text: string | null; // null if undecryptable (not for us / burned)
  sentAt: number;
  cid: string;
  burned: boolean;
  txHash?: string;
}

/** Read a DM thread from chain events, fetch blobs from Bulletin and decrypt. */
export async function loadDirectMessages(
  runner: Signer | Provider,
  bulletin: BulletinClient,
  keypair: KeyPair,
  me: string,
  peer: string,
  limit = 100,
): Promise<LoadedMessage[]> {
  const m = getMessenger(runner);
  const convo: string = await m.dmId(me, peer);
  const count: bigint = await m.messageCount(convo);
  if (count === 0n) return [];
  const offset = count > BigInt(limit) ? Number(count) - limit : 0;
  const page = await m.getMessages(convo, offset, limit);

  const out: LoadedMessage[] = [];
  for (const msg of page) {
    let text: string | null = null;
    if (!msg.burned && msg.cid) {
      try {
        const blob = (await bulletin.get(msg.cid)) as StoredMessage;
        const mine = msg.from.toLowerCase() === me.toLowerCase();
        const payload = mine && blob.self ? blob.self : blob;
        text = decryptWith(payload, keypair.secretKey);
      } catch {
        text = null;
      }
    }
    out.push({
      from: msg.from,
      text,
      sentAt: Number(msg.sentAt) * 1000,
      cid: msg.cid,
      burned: msg.burned,
    });
  }
  return out;
}
