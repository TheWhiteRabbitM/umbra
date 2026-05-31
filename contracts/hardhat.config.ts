import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
// Parity plugin: compiles Solidity to PolkaVM via resolc and enables the
// Polkadot Hub networks. https://github.com/paritytech/hardhat-polkadot
import "@parity/hardhat-polkadot";
import * as dotenv from "dotenv";
import * as path from "path";

// Variables live in the monorepo root .env.
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  // Compilation to PolkaVM (Revive). Requires the resolc binary.
  // See docs.polkadot.com → smart-contract-basics → development-environments.
  resolc: {
    compilerSource: "npm",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    // Local eth-rpc + substrate node for testing (npx hardhat node with the plugin).
    hardhat: {
      polkavm: true,
    },
    // Polkadot Hub TestNet (Paseo Passet Hub). Test account from the faucet.
    polkadotHub: {
      polkavm: true,
      url: process.env.POLKADOT_HUB_RPC_URL ?? "https://testnet-passet-hub-eth-rpc.polkadot.io",
      chainId: Number(process.env.POLKADOT_HUB_CHAIN_ID ?? 420420422),
      accounts,
    },
  },
};

export default config;
