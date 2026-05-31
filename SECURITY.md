# Security

> **Status: experimental, unaudited.** This document is written to be read by a
> hostile reviewer. If you find a hole, that's the point — open an issue.

## Design principles

1. **Plaintext never touches the chain.** Messages are encrypted client-side
   with NaCl `box` (X25519 + XSalsa20-Poly1305). Only the Bulletin Chain CID of
   the ciphertext is referenced on-chain.
2. **Non-custodial.** Keys live in the user's wallet. No server holds secrets or
   message content.
3. **Deletion is physical.** Content lives on the Bulletin Chain, which prunes
   data at the end of its retention period unless renewed. Disappearing messages
   stop being renewed and are pruned network-wide — not merely hidden.
4. **Structural anonymity.** `AnonymousMail` has no sender field; mail is
   delivered by a relayer set. Sender unlinkability is a property of the storage
   layout, not of an access-control check that could be misconfigured.
5. **Minimize trusted parties.** Light-client-first (smoldot) over a centralized
   RPC; TEE relays over plaintext relays.

## Threat model

| Adversary | Mitigation | Residual risk |
|---|---|---|
| Passive chain observer | Only CIDs + minimal metadata on-chain; content encrypted off-chain | Timing/graph analysis of who-talks-to-whom for DMs (channels/mail mitigate) |
| Malicious/compromised server | There is no app server holding data; client-side crypto | Frontend delivery integrity (use SRI / reproducible builds / run locally) |
| Relay operator (anon mail) | Relay runs in a hardware TEE; cannot read sender or plaintext | Trust in TEE vendor attestation; enclave side-channels |
| Recipient device seizure | Messages can be burned; Bulletin entries lapse and are pruned | Anything already decrypted/screenshotted by the recipient |
| Spam / Sybil | Optional Individuality (proof-of-personhood) channel gating | Personhood oracle assumptions |
| Network-level adversary | Light client + (planned) anonymized transport for relay submission | Metadata at the IP layer unless used over Tor/VPN/GrapheneOS |

## Known limitations (read before trusting)

- **Key derivation from a wallet signature.** Convenient (no second secret) but
  the derived X25519 key is only as strong as the wallet's signing and the
  determinism of the signature. Not formally reviewed.
- **No forward secrecy across the long-term identity key** beyond the per-message
  ephemeral key. No Double Ratchet (yet). For Signal-grade ratcheting this is a
  roadmap item, not a current guarantee.
- **Contracts are unaudited.** `Payments.tip` uses checks-effects-interactions
  and custom errors, but nothing here has had an independent audit. Do not hold
  real value.
- **Demo mode simulates the chain.** Simulated transactions are *not* security
  guarantees; they exist for demonstration. See [DISCLAIMER.md](DISCLAIMER.md).
- **Metadata.** Even with encrypted content, DM existence and timing are
  observable on-chain. Use channels/anonymous mail and a network-level anonymizer
  for stronger metadata privacy.

## Recommended operational setup

- Run on **GrapheneOS** (Pixel): hardened kernel, no Google services, per-app
  network/sensor permissions, hardware keystore.
- Prefer the **light client**; avoid third-party RPC endpoints.
- Treat **safety numbers** (key fingerprints in Settings) as you would in Signal:
  verify out-of-band.

## Reporting

Open a GitHub issue, or — if you'd rather not be the sender — use the app. 🙂
