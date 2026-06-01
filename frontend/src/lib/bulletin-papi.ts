import { createClient, Binary } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import type { EncryptedPayload } from "./crypto";
import type { BulletinClient } from "./bulletin";

/**
 * Real Bulletin Chain client via Polkadot-API (PAPI).
 *
 * Writes the encrypted blob with the `TransactionStorage.store` extrinsic and
 * returns its content id (CIDv1, raw + sha2-256 — the single-block CID the
 * network resolves for small blobs). Reads come back through an IPFS gateway.
 *
 * Notes:
 * - The Bulletin Chain is a Substrate chain, so writes need a **Substrate**
 *   signer (PolkadotSigner — e.g. from the pjs extension or a People-Chain key),
 *   which is independent from the EVM wallet used for the Revive contracts.
 * - Connect via a WS endpoint or, for a true light client (no RPC overlord),
 *   swap `getWsProvider` for `getSmProvider` (polkadot-api/sm-provider) + smoldot
 *   with the Bulletin chainspec.
 * - This module is intentionally not imported by the demo path, so PAPI stays
 *   out of the demo bundle.
 */

const GATEWAY =
  import.meta.env.VITE_BULLETIN_IPFS_GATEWAY ?? "https://bulletin-gateway.polkadot.io/ipfs/";

const B32 = "abcdefghijklmnopqrstuvwxyz234567"; // RFC4648 base32, lowercase

function base32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/** CIDv1, codec=raw (0x55), multihash=sha2-256 (0x12,0x20), multibase base32 ('b'). */
async function cidV1Raw(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as BufferSource));
  const cidBytes = new Uint8Array(4 + digest.length);
  cidBytes.set([0x01, 0x55, 0x12, 0x20], 0); // version, codec, hash fn, hash len
  cidBytes.set(digest, 4);
  return "b" + base32(cidBytes);
}

async function gatewayGet(cid: string): Promise<EncryptedPayload> {
  const res = await fetch(`${GATEWAY}${cid}`);
  if (!res.ok) throw new Error(`Bulletin gateway ${res.status} for CID ${cid}`);
  return (await res.json()) as EncryptedPayload;
}

/**
 * Build a real Bulletin client. `signer` is a PolkadotSigner for a
 * Bulletin-authorized Substrate account.
 */
/**
 * Light-client (smoldot) provider for true decentralization — no RPC overlord.
 * Pass the Bulletin Chain chainspec JSON. Dynamic import keeps smoldot out of
 * the bundle unless used.
 *
 *   const provider = await smoldotProvider(bulletinChainSpec);
 *   const client = createPapiBulletinClientWith(provider, signer);
 */
export async function smoldotProvider(chainSpec: string) {
  const { start } = await import("polkadot-api/smoldot");
  const { getSmProvider } = await import("polkadot-api/sm-provider");
  const smoldot = start();
  const chain = await smoldot.addChain({ chainSpec });
  return getSmProvider(chain);
}

export function createPapiBulletinClient(signer: unknown, wsUrl: string): BulletinClient {
  return createPapiBulletinClientWith(getWsProvider(wsUrl), signer);
}

/** Same client, but over any PAPI provider (WS or smoldot). */
export function createPapiBulletinClientWith(provider: any, signer: unknown): BulletinClient {
  const client = createClient(provider);
  const api = client.getUnsafeApi();

  return {
    async put(payload: EncryptedPayload): Promise<string> {
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      const cid = await cidV1Raw(bytes);
      const tx = api.tx.TransactionStorage.store({ data: Binary.fromBytes(bytes) });
      // The signer must be a PolkadotSigner; the cast keeps this dep-light.
      await tx.signAndSubmit(signer as never);
      return cid;
    },
    get: gatewayGet,
  };
}
