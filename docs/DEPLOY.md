# Deploying to Polkadot Hub

End-to-end guide to deploy the Umbra contract network to **Polkadot Hub TestNet**
(Paseo "Passet Hub") via Revive/PolkaVM, and flip the frontend into live mode.

> ⚠️ Unaudited software. Use a throwaway test account and testnet funds only.
> See [AUDIT.md](AUDIT.md) and [PRODUCTION.md](PRODUCTION.md).

## 0. Prerequisites

- Node ≥ 20, `npm install` at the repo root.
- An EVM account (private key) **used only for testing**.
- The Revive toolchain pins **solc 0.8.26** (bundled by `resolc` 0.3.0); the
  contracts already target `pragma solidity ^0.8.26`.

## 1. Fund a test account

1. Create/export a test EVM account (e.g. in MetaMask) — **never a real one**.
2. Get test tokens from the Polkadot Hub TestNet faucet:
   - Faucet: https://faucet.polkadot.io (select the Passet Hub / Polkadot Hub
     TestNet network).
3. Confirm the balance on the explorer:
   - https://blockscout-passet-hub.parity-testnet.parity.io

## 2. Configure `.env`

```bash
cp .env.example .env
```
Set:
```
DEPLOYER_PRIVATE_KEY=0x<your-test-key>
POLKADOT_HUB_RPC_URL=https://testnet-passet-hub-eth-rpc.polkadot.io
POLKADOT_HUB_CHAIN_ID=420420422
```

## 3. Compile (Solidity → PolkaVM)

```bash
npm run contracts:build      # hardhat compile (EVM artifacts + typings)
# Optional: emit PolkaVM blobs directly
cd contracts && npx resolc --bin -o ../.pvm \
  contracts/*.sol contracts/interfaces/*.sol
```
You should get a `.polkavm` blob per contract (Messenger ≈ 47 KB, etc.).

## 4. Deploy + wire

```bash
npm run contracts:deploy     # hardhat run scripts/deploy.ts --network polkadotHub
```
`scripts/deploy.ts` deploys in dependency order and wires everything:

```
IdentityRegistry(deployer)
MockRingVrfVerifier()  →  Individuality(verifier)  →  setPeopleRoot(demo)
Messenger(identity, individuality)
Payments(identity)
AnonymousMail(identity)  →  setRelayer(deployer, true)
```

It writes `frontend/src/contracts/addresses.local.json` (+ per-contract
`*.abi.json`). Example output:
```
Deployer: 0x…
IdentityRegistry: 0x…
Individuality:    0x…
Messenger:        0x…
Payments:         0x…
AnonymousMail:    0x…
✅ Deploy complete. Addresses and ABIs exported to the frontend.
```

> ⚠️ For real personhood, replace `MockRingVrfVerifier` with the People Chain
> ring-VRF verifier and call `Individuality.setVerifier(realVerifier)`. The mock
> accepts all proofs (demo only — see AUDIT C-02).

## 5. Run the frontend in live mode

```bash
npm run dev
```
Once `addresses.local.json` holds non-zero addresses, `contractsDeployed()`
returns true and the UI switches from **demo** to **live**: connecting the
wallet calls `IdentityRegistry.register`, and DMs/tips/aliases hit the real
contracts (`frontend/src/lib/onchain.ts`).

## 6. Post-deploy verification

```bash
# read back state with a quick hardhat console or script
cd contracts && npx hardhat console --network polkadotHub
> const id = await ethers.getContractAt("IdentityRegistry", "<addr>")
> await id.owner()
```
Or open each address on the Blockscout explorer.

## 7. Bulletin Chain & Acurast (separate)

- **Bulletin**: live writes need a Bulletin-authorized **Substrate** signer and
  a WS/smoldot endpoint (`VITE_BULLETIN_WS_URL`). See `lib/bulletin-papi.ts`.
  Reconcile the client CID with the chain's content id before trusting it.
- **Acurast relay**: deploy `acurast/relay.job.ts` to a processor, fund the
  relayer, set `VITE_ACURAST_RELAY_URL`, and `AnonymousMail.setRelayer(relay, true)`.

## Troubleshooting

- **`Source file requires different compiler version`** — pin `^0.8.26` (resolc
  0.3.0 bundles solc 0.8.26).
- **`insufficient funds`** — top up from the faucet; check `POLKADOT_HUB_CHAIN_ID`.
- **`resolc` not found** — `npm install` in `contracts/` (it's a devDependency
  of `@parity/hardhat-polkadot`).
- **Wallet on wrong network** — the frontend auto-adds/switches to Polkadot Hub
  TestNet via `wallet_addEthereumChain` (`frontend/src/lib/wallet.ts`).
