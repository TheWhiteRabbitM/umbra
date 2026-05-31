import { BrowserProvider, JsonRpcSigner } from "ethers";

/**
 * Wallet connection to Polkadot Hub (the EVM-compatible RPC of Revive/PolkaVM).
 *
 * Works with any EIP-1193 wallet (MetaMask, Talisman, SubWallet in EVM mode).
 * Non-custodial: keys stay in the user's wallet.
 */

const CHAIN_ID = Number(import.meta.env.VITE_POLKADOT_HUB_CHAIN_ID ?? 420420422);
const RPC_URL =
  import.meta.env.VITE_POLKADOT_HUB_RPC_URL ??
  "https://testnet-passet-hub-eth-rpc.polkadot.io";

const CHAIN_PARAMS = {
  chainId: "0x" + CHAIN_ID.toString(16),
  chainName: "Polkadot Hub TestNet",
  nativeCurrency: { name: "Paseo DOT", symbol: "PAS", decimals: 18 },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: ["https://blockscout-passet-hub.parity-testnet.parity.io/"],
};

export interface WalletConnection {
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  address: string;
  chainId: number;
}

function getEthereum(): any {
  const eth = (window as any).ethereum;
  if (!eth) {
    throw new Error(
      "No EIP-1193 wallet detected. Install MetaMask, Talisman or SubWallet (EVM mode).",
    );
  }
  return eth;
}

/** Connect the wallet and ensure it is on the Polkadot Hub network. */
export async function connectWallet(): Promise<WalletConnection> {
  const eth = getEthereum();
  await eth.request({ method: "eth_requestAccounts" });
  await ensureChain(eth);

  const provider = new BrowserProvider(eth);
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    address: await signer.getAddress(),
    chainId: Number(network.chainId),
  };
}

/** Add / switch to Polkadot Hub if needed. */
async function ensureChain(eth: any): Promise<void> {
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_PARAMS.chainId }],
    });
  } catch (err: any) {
    // 4902 = chain not yet known to the wallet → add it.
    if (err?.code === 4902) {
      await eth.request({ method: "wallet_addEthereumChain", params: [CHAIN_PARAMS] });
    } else {
      throw err;
    }
  }
}

/** Subscribe to wallet account/network changes. */
export function onWalletChange(cb: () => void): () => void {
  const eth = (window as any).ethereum;
  if (!eth?.on) return () => {};
  eth.on("accountsChanged", cb);
  eth.on("chainChanged", cb);
  return () => {
    eth.removeListener?.("accountsChanged", cb);
    eth.removeListener?.("chainChanged", cb);
  };
}

export function shortAddress(addr: string): string {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

export { CHAIN_ID, RPC_URL };
