# Acurast integration — design proposal

> Why Umbra leans on Acurast, and exactly what it would do.

[Acurast](https://docs.acurast.com/) is a decentralized **confidential compute**
network: a Substrate parachain where developers deploy serverless Node.js
workloads (REST APIs, webhooks, scheduled jobs, LLM inference) to a global pool
of **smartphones** that execute the code inside hardware **Trusted Execution
Environments (TEEs)**. The TEE attests that the code ran unmodified, and keeps
inputs/outputs confidential — *neither the device owner nor anyone else can see
the data*. It's "ride-hailing for compute": 50k+ devices, 115+ countries.

That single property — **compute that even the operator can't observe** — is the
missing piece for the two things a chain alone cannot give you: **sender
anonymity** and **private background work**. Here is how Umbra uses it.

## 1. Anonymous mail relay (the headline use)

**Problem.** A blockchain is a perfect surveillance ledger: `msg.sender` is
permanent. If Alice calls `AnonymousMail.deliver()` herself, she is the sender
forever. A normal relay server fixes the on-chain link but just moves the trust
— the relay operator now sees everyone.

**Acurast solution.** Umbra runs the relay as an Acurast job inside a TEE:

```
Alice ─seal(to_pubkey, body)─▶ Acurast TEE relay ──▶ Bulletin.store() ──▶ CID
                                     │                                     │
                                     └────────── AnonymousMail.deliver(to, CID, ttl)
                                         (msg.sender = relay, never Alice)
```

1. Alice seals the message to the recipient's key (the relay never sees plaintext).
2. She submits the sealed blob to the relay job over an anonymized channel.
3. **Inside the enclave**, the relay strips transport metadata, pins the blob to
   the Bulletin Chain, and calls `AnonymousMail.deliver(to, cid, ttl)`.
4. On-chain there is **no sender field** (verify it in [`AnonymousMail.sol`](../contracts/contracts/AnonymousMail.sol)),
   and the relay's hardware attestation means the operator can't log who Alice is.

The result: **anonymity by construction**, not by promise. The system cannot
leak what it is architecturally incapable of learning. Multiple independent
processors can be chained for a mixnet effect.

## 2. Confidential scheduled jobs

Acurast supports cron-like scheduled deployments. Umbra uses them for:

- **Disappearing messages / self-destruct** — a job that *deliberately does not
  renew* a Bulletin entry, letting it be pruned at TTL (real deletion).
- **Dead-man's switch** — "if I don't check in within N days, release CID X to Y."
- **Scheduled / time-locked sends** — publish a message or mail at a future block.

These need a trustworthy off-chain timer that can hold a secret until fire time —
exactly a TEE job.

## 3. Decentralized push notifications

Mobile push normally routes through Google FCM / Apple APNs — a privacy leak and
a centralization point. An Acurast job can watch `MessageSent` / `MailDelivered`
events and fan out **metadata-minimal** push to subscribed devices, without any
Big Tech intermediary. Pairs naturally with the GrapheneOS recommendation.

## 4. Confidential spam / abuse filtering

Channels gated by Individuality still want content heuristics. A TEE job can run
classification **on ciphertext-derived features or inside the enclave** so the
filter works without exposing message content to any server.

## 5. (Optional, "because we can") on-device confidential AI

Acurast advertises LLM inference on processors. Umbra could offer **local,
private smart-replies, scam-link detection, or translation** where the prompt
never leaves a TEE. Squarely in the "cool, arguably unnecessary, devs will love
it" category — and genuinely private.

---

## Trust model & honesty

- TEEs reduce trust, they don't eliminate it: you trust the silicon vendor's
  attestation and assume no practical enclave break for your threat level. We
  state this plainly rather than hand-wave "trustless".
- Anonymity is **relative to the anonymity set**: more concurrent users and more
  independent relays = stronger unlinkability. A single relay with one user
  hides nothing.
- This document is a **design proposal**. In this repo the relay is represented
  by the `relayer` set in `AnonymousMail` and simulated in the demo; wiring the
  real Acurast deployment is on the [roadmap](../README.md#roadmap).

## Sketch: deploying the relay

```ts
// acurast/relay.job.ts  (illustrative — Node.js workload for an Acurast processor)
export default async function relay(req) {
  const { to, sealed, ttl } = req.body;           // sealed = ciphertext, opaque to us
  const cid = await bulletin.store(sealed, ttl);   // pin to Bulletin Chain
  await anonymousMail.deliver(to, cid, expiry(ttl)); // msg.sender = this processor
  return { ok: true };                             // no sender is ever recorded
}
```

> Deploy with the Acurast CLI/SDK; the processor runs it in its TEE and returns
> an on-chain execution proof. See https://docs.acurast.com/.
