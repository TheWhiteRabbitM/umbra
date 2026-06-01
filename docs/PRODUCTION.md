# Production readiness

> Honest, component-by-component assessment of whether Umbra works **on-chain in
> production** today, what is verified, and what must be done before mainnet.

## TL;DR

The **contract layer is real and deployable**: all five contracts compile to
both EVM (solc 0.8.26) and **PolkaVM via `resolc` 0.3.0** (verified — blob sizes
below), and the **12/12 Hardhat test suite passes**. The **client crypto**
(NaCl box E2E) is real. However, several subsystems are **scaffolds or mocks**
and would **not** be secure/functional in production as-is: Bulletin Chain
writes, the Acurast relay, real ring-VRF proof-of-personhood, and channel group
encryption. Umbra is a **faithful, runnable reference implementation and demo**,
**not** an audited production deployment.

## What is verified in this repo

| Check | Tooling | Result |
|---|---|---|
| Solidity compiles (EVM) | solc 0.8.26 | ✅ 7 files |
| Solidity compiles (PolkaVM) | `resolc` 0.3.0 (Revive, LLVM 18) | ✅ `.polkavm` blobs emitted |
| Contract logic tests | Hardhat + ethers v6 | ✅ 12/12 passing |
| Frontend type-check + build | `tsc` + Vite 6 | ✅ green |
| Demo end-to-end | Playwright | ✅ all views render, txs simulated |

PolkaVM blob sizes (resolc `--bin`): Messenger ≈ 47.4 KB · AnonymousMail ≈
28.6 KB · IdentityRegistry ≈ 20.8 KB · Payments ≈ 19.9 KB · Individuality ≈
15.6 KB · MockRingVrfVerifier ≈ 1.5 KB.

> Toolchain note: `resolc` 0.3.0 bundles **solc 0.8.26**, so contracts pin
> `pragma solidity ^0.8.26`. Targeting 0.8.27/0.8.28 fails resolc until the
> bundled solc is bumped.

## Readiness matrix

Legend: ✅ production-grade design, verified · 🟡 real code, needs live wiring/
verification · 🔴 mock/insecure placeholder.

| Component | State | Notes |
|---|---|---|
| `IdentityRegistry`, `Messenger`, `Payments`, `AnonymousMail` | ✅ | Compile to PolkaVM, tested, standard patterns (custom errors, CEI). Unaudited. |
| `Individuality` contract | ✅ structure | Alias/nullifier/DIM logic tested — but proof verification delegates to a verifier (🔴 mock, see below). |
| ethers.js live calls (`lib/onchain.ts`) | 🟡 | Standard EVM-RPC calls; correct against Polkadot Hub eth-rpc. Not yet run against the live chain in this repo. |
| E2E message encryption (NaCl box) | ✅ basic | Sound for 1:1 confidentiality + integrity. No Double Ratchet / forward secrecy across the long-term key (see SECURITY.md). |
| Bulletin Chain writes (`lib/bulletin-papi.ts`) | 🟡 | Real PAPI `TransactionStorage.store`; needs a Bulletin-authorized **Substrate** signer + endpoint, and the **CID computed client-side must be reconciled with the chain's** (see below). |
| Acurast relay (`acurast/relay.job.ts`) | 🔴→🟡 | Real submission code, but `pinToBulletin()` is unimplemented and it must be deployed to Acurast with a funded relayer. |
| Ring-VRF proof of personhood | 🔴 | `MockRingVrfVerifier` accepts everything. Real proofs require the People Chain verifier/precompile. |
| Channel group encryption | 🔴 | Key derived from the public channel id → anyone can derive it. Not confidential for private groups. Needs MLS. |
| Gas / fee UX ("pay gas in any asset") | 🔴 | UI mock; depends on Polkadot Hub fee-asset support. |
| Message indexing / history | 🟡 | `getMessages` is bounded/paginated on-chain; production wants an indexer + event subscriptions. |

## What it takes to ship to mainnet

1. **Security audit** of all contracts (no audit has been performed).
2. **Deploy + verify on Polkadot Hub TestNet** with `resolc` artifacts; exercise
   gas, contract size limits, and Revive/EVM semantic differences end-to-end.
3. **Bulletin Chain**: provision a storage-authorized Substrate account; replace
   the WS provider with **smoldot** (light client) + chainspec; **verify CID
   derivation** — confirm whether the chain's content id for
   `TransactionStorage.store` matches client-side CIDv1(raw, sha2-256) for our
   blob sizes, and read the authoritative id from the storage event/inclusion
   proof rather than trusting the local computation.
4. **Acurast**: implement `pinToBulletin()`, deploy the relay job to processors,
   fund the relayer, register it via `AnonymousMail.setRelayer`, and validate
   TEE attestation. Chain ≥2 processors for a real mixnet/anonymity set.
5. **Individuality**: integrate the **People Chain** ring-VRF: real proof
   generation client-side and a real `IRingVrfVerifier` (precompile or verifier
   contract) replacing the mock.
6. **Groups**: replace the derived channel key with a ratcheting group scheme
   (MLS / sender-keys) for real channel confidentiality + forward secrecy.
7. **Messaging hardening**: add a Double Ratchet for DM forward secrecy; an
   indexer for history; rate-limiting; abuse handling.
8. **Key & account UX**: reconcile the **EVM wallet** (Revive contracts) with the
   **Substrate signer** (Bulletin), or move to a single account model.
9. **Ops**: monitoring, key management, incident response, and the legal review
   in [DISCLAIMER.md](../DISCLAIMER.md).

## Bottom line

- **Would the contracts deploy and run on Polkadot Hub?** Yes — they compile to
  PolkaVM and the logic is tested. After an audit and testnet verification,
  this layer is production-capable.
- **Would the full privacy product work end-to-end in production today?** No —
  Bulletin writes, the Acurast relay, real proof-of-personhood, and private
  group encryption are not yet wired/secured. The repository is an honest
  reference implementation with a fully working **demo mode**, not a shipped
  product.
