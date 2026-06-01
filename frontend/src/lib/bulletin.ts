import type { EncryptedPayload } from "./crypto";

/**
 * Polkadot Bulletin Chain integration.
 *
 * "Write-to-chain, read-from-network" model:
 *  - WRITE: submit a `store` / `store_with_cid_config` transaction on the
 *    Bulletin Chain (Substrate) carrying the encrypted blob; you get back a CID.
 *    Requires an authorization (faucet on TestNet, privileged account on
 *    MainNet) because the Bulletin Chain has no token and no fees.
 *  - READ: fetch the blob by CID via an IPFS gateway / Bitswap / Helia.
 *
 * Crucially, the Bulletin Chain is NOT immutable: stored data has a retention
 * period and is pruned network-wide if not renewed. That is exactly what powers
 * Umbra's disappearing messages and real deletion.
 *
 * In this scaffold, reads use the IPFS gateway (ready to use); writes sit behind
 * an interface with a local "mock" fallback, so the UI is fully navigable before
 * wiring a real Bulletin node/extension.
 * See: docs.polkadot.com/chain-interactions/store-data/bulletin-chain
 */

const GATEWAY =
  import.meta.env.VITE_BULLETIN_IPFS_GATEWAY ??
  "https://bulletin-gateway.polkadot.io/ipfs/";

export interface BulletinClient {
  /** Upload an encrypted payload and return the CID. */
  put(payload: EncryptedPayload): Promise<string>;
  /** Fetch and parse an encrypted payload by CID. */
  get(cid: string): Promise<EncryptedPayload>;
}

/** Real fetch via IPFS gateway (works for any already-published CID). */
async function gatewayGet(cid: string): Promise<EncryptedPayload> {
  const res = await fetch(`${GATEWAY}${cid}`);
  if (!res.ok) throw new Error(`Bulletin gateway ${res.status} for CID ${cid}`);
  return (await res.json()) as EncryptedPayload;
}

/**
 * Mock client for development: simulates the Bulletin Chain in localStorage,
 * generating deterministic CIDs. Swappable for the real client (see
 * createSubstrateBulletinClient) without touching the UI.
 */
export function createMockBulletinClient(): BulletinClient {
  const KEY = "umbra.bulletin.mock";
  const read = (): Record<string, EncryptedPayload> =>
    JSON.parse(localStorage.getItem(KEY) ?? "{}");
  const write = (db: Record<string, EncryptedPayload>) =>
    localStorage.setItem(KEY, JSON.stringify(db));

  return {
    async put(payload) {
      const cid = await fakeCid(payload);
      const db = read();
      db[cid] = payload;
      write(db);
      return cid;
    },
    async get(cid) {
      const db = read();
      if (db[cid]) return db[cid];
      // Fallback: if not in local cache, try the real gateway.
      return gatewayGet(cid);
    },
  };
}

/**
 * Real Bulletin Chain client. Implemented with Polkadot-API (PAPI) in
 * ./bulletin-papi.ts (`TransactionStorage.store` + CIDv1). It needs a Substrate
 * signer, so it's created explicitly rather than swapped in automatically:
 *
 *   import { createPapiBulletinClient } from "./bulletin-papi";
 *   const client = createPapiBulletinClient(substrateSigner, wsUrl);
 *
 * Kept as a thin pointer here so the demo path never pulls PAPI into its bundle.
 */
export async function createSubstrateBulletinClient(
  signer: unknown,
  wsUrl: string,
): Promise<BulletinClient> {
  const { createPapiBulletinClient } = await import("./bulletin-papi");
  return createPapiBulletinClient(signer, wsUrl);
}

async function fakeCid(payload: EncryptedPayload): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `bafy-mock-${hex.slice(0, 46)}`;
}
