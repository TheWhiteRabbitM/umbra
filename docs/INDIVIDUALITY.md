# Proof of Personhood — Individuality integration

> How Umbra integrates proof of personhood **as Gavin Wood imagined it**:
> anonymous uniqueness via contextual aliases, not a global identity flag.

## The vision (and why a boolean is wrong)

Gavin Wood's **Project Individuality** runs on the **Polkadot People Chain** and
answers one question — *"are you a unique human?"* — **without** answering *"who
are you?"*. The earlier Umbra prototype used a single `personhood` boolean. That
is exactly the anti-pattern Individuality is designed to kill: a global,
linkable identity. We replaced it.

The faithful primitives:

- **Contextual aliases.** A **ring-VRF** turns your registered humanity into a
  *different, unlinkable* alias for every context (app, channel, referendum).
  You never present the same pseudonym twice. Your actions across services
  cannot be correlated.
- **Nullifiers.** Each `(person, context)` yields one deterministic nullifier,
  so a person can hold **at most one alias per context** — Sybil resistance with
  **zero KYC**.
- **DIMs** (Decentralized Individuality Mechanisms) — "personhood games" with
  assurance levels:
  - **DIM1 — Proof of Individuality**: uniqueness; enough for channels, anti-spam,
    one-person-one-vote.
  - **DIM2 — Proof of Verified Individuality**: higher assurance for high-value
    actions (treasury, sensitive governance).
- **People root.** A commitment to the registered set of unique humans, published
  by an OpenGov-controlled bridge from the People Chain. The ring/zk lives on the
  People Chain; contracts verify proofs against the root.
- **Mechanisms to become a human**: e.g. **Proof of Ink** (a unique on-chain
  random tattoo pattern — the *Kappa Sigma Mu* society on Kusama), in-person
  personhood gatherings, and higher-assurance verified attestations.

## How Umbra uses it

```
Person (registered on People Chain)
   │  ring-VRF(personSecret, context) ──► unlinkable alias + nullifier
   ▼
Individuality.registerAlias(context, nullifier, dim, proof)
   │   • verifier checks the proof against peopleRoot
   │   • nullifier marked used  → one alias per person per context
   ▼
Messenger.sendToChannel(channel, …)
       gate: individuality.dimOf(channel /* = context */, alias) >= channel.minDim
```

- **Channels are gated per-context.** A personhood channel uses its own `bytes32`
  id as the Individuality **context**. To post you must hold a valid alias of at
  least the channel's `minDim`. Your `#cypherpunks` alias is unlinkable to your
  `opengov.referendum` alias — same human, no correlation.
- **One human, one voice per room**, without anyone learning which human.
- Naturally extends to **anonymous mail** (a context per mailbox), Sybil-resistant
  airdrops, and one-person-one-vote governance.

See the contract: [`Individuality.sol`](../contracts/contracts/Individuality.sol)
and the gate in [`Messenger.sol`](../contracts/contracts/Messenger.sol). The
in-app surface is the **personhood** tab.

## Honesty / what's stubbed

- The **ring-VRF verification** is represented by `IRingVrfVerifier`; the repo
  ships a clearly-named `MockRingVrfVerifier` for demo/test. Production wires the
  real verifier exported by the People Chain.
- The **people root** is a demo placeholder set by the deployer-as-bridge; in
  production it's published by an OpenGov-controlled bridge.
- The frontend simulates `registerAlias` (alias + nullifier derivation) so the
  flow is demonstrable; the privacy properties are a property of the *design*
  above, realized once the People Chain verifier is connected.

## Sources

- Proof of Personhood / Project Individuality — https://polkadot.com/blog/proof-of-personhood-polkadot-project-individuality/
- Launch plan (DIM1/DIM2, contextual aliases) — https://crypto.news/polkadots-gavin-wood-lays-out-launch-plan-for-proof-of-personhood-debut/
- Overview — https://www.proofofpersonhood.how/
