# Security audit (internal)

> **This is an internal self-review by the authors, not a third-party audit.**
> No independent auditor has reviewed this code. Do not deploy to mainnet or
> handle real value without a professional audit. Scope, method and findings are
> below so reviewers can reproduce and extend the analysis.

- **Date**: 2026-06-01
- **Commit**: see `git log` (post "Verify PolkaVM compilation")
- **Scope**: `contracts/contracts/*.sol` (IdentityRegistry, Individuality,
  Messenger, Payments, AnonymousMail, interfaces, MockRingVrfVerifier) and the
  client crypto/integration (`frontend/src/lib/{crypto,onchain,bulletin-papi,relay}.ts`).
- **Out of scope**: the (unwired) People Chain ring-VRF verifier, the Acurast
  TEE runtime, the Bulletin Chain node, and any third-party dependency internals.
- **Method**: manual review against a checklist (access control, reentrancy,
  CEI, integer/overflow [solc 0.8 checked arithmetic], unbounded loops, external
  calls, event completeness, upgrade/pause, key handling, metadata leakage) +
  Hardhat unit tests (12/12) + EVM (solc 0.8.26) and PolkaVM (`resolc` 0.3.0)
  compilation.

## Severity summary

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| C-01 | Personhood `dim` is caller-supplied; trust rests on the verifier | High* | Acknowledged (by design; verifier must bind `dim`) |
| C-02 | `MockRingVrfVerifier` accepts all proofs | High* | Acknowledged (demo only; replace for prod) |
| M-01 | Authorized relay can spam any registered inbox | Medium | Acknowledged (rate-limit / opt-in in prod) |
| M-02 | Channel group key derivable from public channel id | Medium | Acknowledged (MVP; MLS in prod) |
| L-01 | Unsolicited DMs to any registered user (spam) | Low | Acknowledged (optional sender-gating) |
| L-02 | Channel-id squatting (first-come `createChannel`) | Low | Acknowledged (namespacing in prod) |
| L-03 | `owner`/`bridge` single-step transfer, no pause/upgrade | Low | Acknowledged (immutability is intentional) |
| I-01 | `updateProfile` used a revert string | Info | **Fixed** → `NotRegistered` custom error |
| I-02 | `ChannelCreated` omitted `minDim` (indexing gap) | Info | **Fixed** → added `minDim` to event |
| I-03 | Re-`register` can rotate the encryption key silently | Info | Acknowledged (document; consider `KeyRotated` event) |

\* "High" is conditional on production wiring: with the mock verifier the
personhood guarantees are **not** real. The contract logic is correct; the
cryptographic assurance depends on the real verifier.

## Findings (detail)

**C-01 — `Individuality.registerAlias` trusts `dim`.** The caller passes `dim`
(1 or 2). The contract only checks `dim ∈ {1,2}` and defers to
`verifier.verify(...)`. A correct production verifier MUST bind the proof to the
claimed `dim` (DIM1 vs DIM2), otherwise anyone could claim DIM2. With the mock
verifier this is unchecked. *Recommendation*: the real `IRingVrfVerifier` must
validate `dim` as part of the proof statement.

**C-02 — Mock verifier.** `MockRingVrfVerifier.verify` returns `true`
unconditionally; it exists only so the demo/tests run. *Recommendation*: replace
with the People Chain ring-VRF verifier (precompile or verifier contract) before
any real personhood claim.

**M-01 — Relay inbox spam.** `AnonymousMail.deliver` is gated to authorized
relayers, but a relayer can deliver to any registered recipient. A malicious/
compromised relayer could flood inboxes. *Recommendation*: per-recipient rate
limits, recipient opt-in/blocklists, or proof-of-personhood on the author side
enforced inside the TEE.

**M-02 — Channel key.** Channel posts are sealed to
`keccak256("umbra-channel" ‖ channelId)`-derived key; anyone who learns the
public channel id can derive it. Fine for "encrypted at rest among members," not
for confidentiality vs. non-members or forward secrecy. *Recommendation*: MLS /
sender-keys with rotation.

**L-01 — DM spam.** `sendDirect` accepts any registered recipient. Mitigations:
optional sender personhood gate, contact allowlists, or client-side filtering.

**L-02 — Channel squatting.** First caller to `createChannel(channelId,...)`
owns it. Mitigation: namespacing (e.g., `keccak256(admin ‖ name)`) or a registry.

**L-03 — Governance/immutability.** Contracts are immutable with single-step
`owner`/`bridge`. Intentional (no admin backdoor, no upgrade key), but there is
no emergency pause and no 2-step ownership transfer. Documented as a trade-off.

**I-01/I-02 — Fixed** in this pass (custom error; richer event). **I-03** —
re-`register` rotates the key; consider emitting a dedicated event and warning
the UI, since cached recipient keys would go stale.

## Positive observations

- **No plaintext on-chain** — only CIDs + minimal metadata.
- **Checks-effects-interactions** in `Payments.tip`; state updated before the
  external `call`; failure reverts the tx. No reentrancy surface elsewhere
  (only `view` cross-contract reads).
- **Custom errors** throughout; **append-only** logs; **paginated** reads (no
  unbounded returns).
- **Structural anonymity** in `AnonymousMail` (no `from` field) is verifiable by
  reading the storage layout.
- Compiles to **EVM and PolkaVM**; solc 0.8.x **checked arithmetic** (no manual
  SafeMath needed).

## Client-side review (crypto)

- NaCl `box` (X25519 + XSalsa20-Poly1305), per-message ephemeral key + random
  nonce — sound for 1:1 confidentiality/integrity.
- Key derived from a wallet signature — convenient, **not** formally reviewed;
  relies on signature determinism/secrecy. No Double Ratchet (limited forward
  secrecy). See [SECURITY.md](../SECURITY.md).
- CID is computed client-side (CIDv1 raw/sha2-256); production must reconcile
  with the chain's content id (read from the storage event/proof).

## Reproduce

```bash
npm install
npm test --workspace contracts            # 12/12
cd contracts && npx hardhat compile        # EVM artifacts
npx resolc --bin -o ../.pvm contracts/*.sol contracts/interfaces/*.sol  # PolkaVM
```
