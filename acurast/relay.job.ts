/**
 * Umbra anonymous-mail relay — Acurast TEE workload.
 *
 * Deploy this as an Acurast job (https://docs.acurast.com/). It runs inside the
 * processor's hardware Trusted Execution Environment, so neither the device
 * owner nor anyone else learns who sent a message. The relay:
 *
 *   1. receives an already-sealed blob (it can't read the content),
 *   2. pins it to the Bulletin Chain → CID,
 *   3. calls AnonymousMail.deliver(to, cid, expiresAt) on Polkadot Hub.
 *
 * Because submission comes from the relay account, `msg.sender` on-chain is the
 * relay — never the author. The contract stores no sender field at all. This is
 * the structural anonymity guarantee (see contracts/AnonymousMail.sol).
 *
 * This file is standalone (not part of the web bundle). Configure via the
 * Acurast deployment env: RPC_URL, RELAY_KEY (relayer EOA), MAIL_ADDRESS,
 * BULLETIN_WS_URL.
 */

import { ethers } from "ethers";

const ANON_MAIL_ABI = [
  "function deliver(address to, string cid, uint64 expiresAt) returns (uint256)",
];

interface RelayRequest {
  to: string; // recipient EVM address (Polkadot Hub)
  sealed: unknown; // ciphertext sealed to the recipient's key — opaque to us
  ttlSeconds?: number; // Bulletin retention; 0 = none
}

interface Env {
  RPC_URL: string;
  RELAY_KEY: string;
  MAIL_ADDRESS: string;
  BULLETIN_WS_URL: string;
}

/** Pin a sealed blob to the Bulletin Chain and return its CID.
 *  Implemented with Polkadot-API (TransactionStorage.store) at deploy time. */
async function pinToBulletin(_env: Env, sealed: unknown): Promise<string> {
  // See frontend/src/lib/bulletin-papi.ts for the PAPI store() implementation.
  // The relay holds a Bulletin-authorized Substrate signer in its TEE.
  void sealed;
  throw new Error("wire pinToBulletin() to the Bulletin Chain (PAPI store)");
}

/** Acurast entrypoint: one fulfillment per request. */
export default async function relay(req: RelayRequest, env: Env): Promise<{ ok: true; index: number }> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(req.to)) throw new Error("bad recipient");

  // 1. Pin the sealed payload to Bulletin (content never decrypted here).
  const cid = await pinToBulletin(env, req.sealed);

  // 2. Deliver on-chain as the relay — author stays unlinkable.
  const provider = new ethers.JsonRpcProvider(env.RPC_URL);
  const wallet = new ethers.Wallet(env.RELAY_KEY, provider);
  const mail = new ethers.Contract(env.MAIL_ADDRESS, ANON_MAIL_ABI, wallet);

  const ttl = req.ttlSeconds ?? 0;
  const expiresAt = ttl === 0 ? 0 : Math.floor(Date.now() / 1000) + ttl;
  const tx = await mail.deliver(req.to, cid, expiresAt);
  const rc = await tx.wait();
  const index = Number(rc?.logs?.length ?? 0);

  return { ok: true, index };
}
