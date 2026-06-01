# Architecture

Umbra is a monorepo split into a **Solidity contract network** (Polkadot Hub via
Revive/PolkaVM) and a **React client** that does all cryptography locally and
stores ciphertext on the **Bulletin Chain**. Confidential off-chain work
(anonymous-mail relaying, personhood proofs) is delegated to **Acurast** TEEs and
the **People Chain**.

See also: [CONTRACTS.md](CONTRACTS.md) (per-contract reference),
[SECURITY.md](../SECURITY.md) (crypto/threat model),
[PRODUCTION.md](PRODUCTION.md) (readiness),
[ACURAST.md](ACURAST.md), [INDIVIDUALITY.md](INDIVIDUALITY.md).

## Design tenets

1. **Plaintext is never on-chain.** Only opaque CIDs + minimal metadata.
2. **Non-custodial.** Keys live in the user's wallet; no server holds secrets.
3. **Deletion is physical.** Content on the Bulletin Chain is pruned at TTL, not
   merely hidden.
4. **Anonymity is structural.** `AnonymousMail` has no sender field; personhood
   uses unlinkable per-context aliases.
5. **Minimize trusted parties.** Light-client-first; TEE relays over plaintext
   relays; the chain as the authorization/index layer, not the data store.

## Layers & trust boundaries

```
┌─ Client (browser / mobile) — TRUSTED with plaintext & keys ──────────────────┐
│  React UI · NaCl box E2E (lib/crypto) · key derived from a wallet signature   │
│  ethers v6 (lib/onchain)         PAPI (lib/bulletin-papi)     relay client     │
└───────┬───────────────────────────────┬───────────────────────────┬──────────┘
        │ EVM-RPC (eth_*)                │ Substrate tx               │ HTTPS (sealed)
┌───────▼──────────┐           ┌─────────▼──────────┐        ┌────────▼─────────┐
│  Polkadot Hub    │           │  Bulletin Chain    │        │  Acurast (TEE)   │
│  Revive / PolkaVM │           │  TransactionStorage │        │  relay job       │
│  ── contracts ──  │           │  (prunable blobs)   │        │  (sender-blind)  │
│  IdentityRegistry │◀──reads── │                     │        └────────┬─────────┘
│  Individuality ◀──┼──gate──┐  └─────────────────────┘                 │ deliver()
│  Messenger        │        │            ▲ store/CID                    │
│  Payments         │        └─ People Chain (ring-VRF, DIM1/DIM2) ◀ root │
│  AnonymousMail ◀──┼──────────────────────────────────────────────────-┘
└──────────────────┘
```

**Trust:** the client is trusted with plaintext and the E2E key. The chain sees
only CIDs/metadata. The Bulletin Chain stores ciphertext (confidential by
encryption, not by access control). The Acurast relay is trusted only for
*availability*; confidentiality/anonymity hold because it runs in a TEE and the
content is sealed before it arrives.

## Accounts

- **EVM account** (MetaMask/Talisman) signs Revive contract calls on Polkadot Hub.
- **E2E key**: an X25519 keypair derived deterministically from a one-time wallet
  signature (`KEY_DERIVATION_MESSAGE`), so there is no second secret to manage.
- **Substrate signer** (separate) is required for Bulletin `store`. Reconciling
  the two account models is a production task (see PRODUCTION.md).

## Data model

- **DM**: `conversationId = keccak256("dm", min(a,b), max(a,b))` → append-only
  `Message[]`. Each message: `{from, to, channel:0, cid, sentAt, expiresAt, burned}`.
- **Channel**: `channel` (bytes32) is both the thread id **and** the Individuality
  context. `{admin, requiresPersonhood, minDim, metadataCid}`.
- **Mail**: per-recipient append-only `Mail[]` with **no sender**:
  `{cid, deliveredAt, expiresAt, read, burned}`.
- **Alias**: `(context, aliasAccount) → {dim, since, active}` + spent nullifiers.
- **Off-chain blob** (Bulletin): `EncryptedPayload {v, nonce, ephemeralPubKey,
  ciphertext}`, optionally `+ self` (a copy sealed to the sender). See SECURITY.

## Key flows

**Send a DM (live mode)** — `lib/onchain.ts#sendDirectOnchain`:
```
1. key = IdentityRegistry.encryptionKeyOf(to)
2. blob = NaCl.box(plaintext, key); blob.self = NaCl.box(plaintext, myKey)
3. cid = Bulletin.store(blob)                       // PAPI; CIDv1(raw,sha256)
4. Messenger.sendDirect(to, cid, ttl)               // only the CID hits chain
5. peers read MessageSent → Bulletin.get(cid) → NaCl.box_open(my secret)
```

**Send anonymous mail** — `lib/relay.ts` + `acurast/relay.job.ts`:
```
1. key = IdentityRegistry.encryptionKeyOf(to)
2. sealed = NaCl.box({subject,body}, key)           // opaque to the relay
3. POST sealed → Acurast TEE relay (anonymized transport)
4. relay: cid = Bulletin.store(sealed); AnonymousMail.deliver(to, cid, expiry)
   → msg.sender = relay, never the author; no sender field is stored
```

**Claim a contextual alias** — `Individuality.registerAlias`:
```
context   = keccak256(contextLabel)
nullifier = ringVRF(personSecret, context)          // deterministic per person
verifier.verify(peopleRoot, context, aliasAccount, nullifier, proof) == true
→ one alias per (person, context); unlinkable across contexts
```

## Frontend internals

- **Store**: a single `useApp()` hook holds wallet connection, the derived E2E
  keypair, the simulated chain (live block height + tx activity), conversations,
  mail, wallet assets and contextual aliases. Actions branch on `liveMode`
  (`contractsDeployed() && wallet`).
- **lib/**: `wallet.ts` (EIP-1193 → Polkadot Hub), `crypto.ts` (NaCl box),
  `bulletin.ts` (mock + lazy real client), `bulletin-papi.ts` (real PAPI store),
  `onchain.ts` (ethers contract calls), `relay.ts` (Acurast client),
  `chain.ts` (demo tx/block simulation).
- **UI**: flat, minimalist, **strictly black & white** with **soft rounded
  corners**; hairline borders, mono-forward type, no blur/shadow/gradient/colour.
  Mobile-first (bottom tab bar) + desktop rail/aside above 880/1180px. `⌘K`
  command palette.
- **Demo ↔ live**: demo uses real crypto + a mock Bulletin (localStorage) + a
  simulated chain (`lib/chain.ts`: tx hashes, ticking block height, fees). Live
  mode runs the real calls in `lib/onchain.ts` / `relay.ts`.

## Build, test, deploy

- **Contracts**: `npm run contracts:build` (Hardhat + resolc → PolkaVM),
  `npm test --workspace contracts` (12 tests), `npm run contracts:deploy`
  (deploys in order, writes `frontend/src/contracts/addresses.local.json` + ABIs).
- **Frontend**: `npm run dev` / `npm run build` (Vite, base `./` for GitHub
  Pages). `npm run shots` regenerates `docs/media/` via Playwright.
- **CI**: `.github/workflows/ci.yml` (contract tests + frontend build),
  `.github/workflows/pages.yml` (publishes the demo).
