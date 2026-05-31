/**
 * Simulated chain layer.
 *
 * In demo mode Umbra does not broadcast real transactions, but the UI is
 * driven by realistic-looking on-chain activity: deterministic-looking tx
 * hashes, a live block height that ticks at Polkadot's 6s cadence, pending →
 * finalized lifecycle, gas/fee figures and block explorer links. This makes the
 * product demonstrable end-to-end (and the screenshots look like a live dapp)
 * without requiring a funded testnet account.
 *
 * Everything here is clearly isolated so the same call sites can be swapped for
 * real ethers.js contract calls once addresses are deployed (see contracts/).
 */

export const POLKADOT_HUB = {
  name: "Polkadot Hub",
  shortName: "PAH",
  chainId: 420420422,
  symbol: "PAS",
  blockTimeMs: 6000,
  explorer: "https://blockscout-passet-hub.parity-testnet.parity.io",
  // Plausible recent block height to seed the live ticker.
  genesisBlock: 24_815_003,
} as const;

const HEX = "0123456789abcdef";

export function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let out = "0x";
  for (const b of arr) out += HEX[b >> 4] + HEX[b & 15];
  return out;
}

export const randomTxHash = () => randomHex(32);

export function shortHash(h: string, head = 6, tail = 4): string {
  if (!h) return "";
  return h.length <= head + tail + 2 ? h : `${h.slice(0, 2 + head)}…${h.slice(-tail)}`;
}

export const explorerTx = (hash: string) => `${POLKADOT_HUB.explorer}/tx/${hash}`;
export const explorerAddr = (addr: string) => `${POLKADOT_HUB.explorer}/address/${addr}`;

export type TxStatus = "pending" | "finalized" | "failed";

export interface TxRecord {
  hash: string;
  method: string; // e.g. "Messenger.sendDirect"
  contract: string; // contract label
  status: TxStatus;
  block?: number;
  gas: number; // weight units (cosmetic)
  feePas: string; // fee in PAS
  at: number; // epoch ms
}

/** Build a fresh pending tx for a given contract method. */
export function makeTx(method: string, contract: string): TxRecord {
  return {
    hash: randomTxHash(),
    method,
    contract,
    status: "pending",
    gas: 180_000 + Math.floor(Math.random() * 90_000),
    feePas: (0.0008 + Math.random() * 0.0021).toFixed(5),
    at: Date.now(),
  };
}
