# Security

> Written to be read by a hostile reviewer. **Experimental, unaudited.** If you
> find a hole, that's the point — open an issue. See also
> [docs/PRODUCTION.md](docs/PRODUCTION.md) and [DISCLAIMER.md](DISCLAIMER.md).

## 1. Cryptographic protocol

### 1.1 Primitives
- **Sealing**: NaCl `box` = X25519 (ECDH) + XSalsa20-Poly1305 (AEAD), via
  `tweetnacl`. 24-byte random nonce per message; 16-byte Poly1305 tag.
- **Ephemeral sender key** per message → the long-term identity key is not used
  as the ECDH sender, giving per-message unlinkability of the sender key.
- **Hashing / ids**: keccak-256 (conversation ids, context ids, nullifier
  derivation). Bulletin CID: CIDv1, codec `raw` (0x55), multihash sha2-256.

### 1.2 Identity key derivation
`deriveEncryptionKeypair(sig)` takes the first 32 bytes of an EIP-191
`personal_sign` over a fixed domain string (`KEY_DERIVATION_MESSAGE`) and uses
them as the X25519 secret (`nacl.box.keyPair.fromSecretKey`). Rationale: no
second secret for the user; deterministic across devices given the same wallet.
**Caveats**: security reduces to the wallet's signature determinism and secrecy;
the message is fixed (no per-context separation of the *identity* key — contexts
are handled by Individuality, not here); not formally reviewed. The X25519
public key is published on-chain as `bytes32` via `IdentityRegistry.register`.

### 1.3 Message payload
On-chain: only `cid` (+ `from/to/channel/sentAt/expiresAt/burned`). Off-chain
Bulletin blob:
```json
{ "v":1, "nonce":"b64", "ephemeralPubKey":"b64", "ciphertext":"b64",
  "self": { "nonce":"b64", "ephemeralPubKey":"b64", "ciphertext":"b64" } }
```
The DM payload is sealed to the **recipient** key; `self` is a second sealing to
the **sender's own** key so the author can read their own history when reloading
from chain events. Both are independent NaCl boxes; the chain and the Bulletin
node see only ciphertext. On read, `from == me ? open(self) : open(payload)`.

### 1.4 Channels (group)
Channel posts are sealed to a **shared key derived from the channel id**:
`channelKeypair = box.keyPair.fromSecretKey(keccak256("umbra-channel" ‖ channelId))`.
This is an **MVP**: any member who knows the (public) channel id can derive the
key — fine for "encrypted at rest, readable by members," but **not** confidential
against non-members who learn the id, and **no forward secrecy / rotation**.
Production must use a ratcheting group scheme (MLS / sender-keys). DMs are
unaffected.

### 1.5 Proof of personhood (Individuality)
Per-context unlinkable aliases with a deterministic nullifier
`ringVRF(personSecret, context)`; the contract enforces one alias per
`(person, context)` and delegates proof checking to an `IRingVrfVerifier`. In
this repo the verifier is `MockRingVrfVerifier` (accepts all) — **the real
ring-VRF/zk verification from the People Chain is not wired**. See
[docs/INDIVIDUALITY.md](docs/INDIVIDUALITY.md).

## 2. Threat model

| Adversary | Mitigation | Residual risk |
|---|---|---|
| Passive chain observer | Only CIDs + minimal metadata on-chain; content encrypted off-chain | DM social graph + timing are visible (who↔who, when); channels/mail reduce this |
| Bulletin node / gateway operator | Blobs are ciphertext; keys never leave the client | Availability; blob size/timing metadata |
| Malicious frontend delivery | Non-custodial, client-side crypto | Supply-chain integrity — use SRI, reproducible builds, or run locally |
| Anonymous-mail relay operator | TEE attestation; content sealed before arrival; no sender field on-chain | Trust in TEE vendor + attestation; enclave side-channels; small anonymity set |
| Recipient device compromise | `burn` + Bulletin TTL pruning | Anything already decrypted/screenshotted |
| Sybil / spam | Individuality per-context (DIM1/DIM2) | Only as strong as the (currently mocked) verifier |
| Network-level (IP) adversary | Light-client; sealed relay payloads | IP-layer metadata unless used over Tor/VPN/GrapheneOS |
| Contract-level attacker | Custom errors, CEI in `Payments`, access control, append-only logs | **Unaudited**; Revive/EVM semantic differences not yet exercised on-chain |

## 3. Assumptions
- The user's wallet signs deterministically and keeps its key secret.
- X25519/XSalsa20-Poly1305 and keccak-256 are secure at the 128-bit level.
- TEEs (for the relay) provide confidentiality + remote attestation for the
  configured threat level (a vendor-trust assumption we state, not eliminate).
- The Bulletin Chain prunes expired data network-wide (the deletion guarantee).

## 4. Known limitations (read before trusting)
- **Unaudited contracts**; no mainnet use with real value.
- **Demo mode simulates the chain** — simulated txs are not guarantees.
- **No Double Ratchet**: DM forward secrecy is limited to per-message ephemeral
  keys; long-term key compromise exposes past DMs decryptable with it.
- **Channel key is derivable** (see 1.4); **personhood verifier is mocked** (1.5).
- **CID authority**: the client computes CIDv1 locally; production must reconcile
  it with the chain's content id (read from the storage event/proof).
- **Metadata**: existence/timing/size are observable even with encrypted content.
- **Account split**: EVM wallet vs Substrate Bulletin signer (UX + key hygiene).

## 5. Recommended operational setup
- Run on **GrapheneOS** (Pixel): hardened kernel, no Google services, per-app
  network/sensor permissions, hardware keystore.
- Prefer the **light client**; avoid third-party RPC endpoints.
- Verify **safety numbers** (key fingerprints, Settings) out-of-band, Signal-style.
- Route relay submissions over an anonymizing network (Tor/VPN).

## 6. Disclosure
Open a GitHub issue — or, if you'd rather not be the sender, use the app. 🙂
