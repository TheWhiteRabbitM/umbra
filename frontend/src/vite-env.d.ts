/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POLKADOT_HUB_RPC_URL?: string;
  readonly VITE_POLKADOT_HUB_CHAIN_ID?: string;
  readonly VITE_BULLETIN_IPFS_GATEWAY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "tweetnacl-util" {
  export function decodeUTF8(s: string): Uint8Array;
  export function encodeUTF8(arr: Uint8Array): string;
  export function decodeBase64(s: string): Uint8Array;
  export function encodeBase64(arr: Uint8Array): string;
}
