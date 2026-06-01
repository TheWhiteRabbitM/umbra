# Contract reference

Solidity `^0.8.26`, optimizer on (200 runs). Targets **Polkadot Hub** via
`resolc` (Revive → PolkaVM); also EVM-compatible. Deploy order and wiring:

```
IdentityRegistry(attester)
MockRingVrfVerifier()                         → Individuality(verifier)
Individuality.setPeopleRoot(root)             (bridge = deployer in demo)
Messenger(identityRegistry, individuality)
Payments(identityRegistry)
AnonymousMail(identityRegistry)               → setRelayer(acurastRelay, true)
```

Design rules used throughout: custom errors (no revert strings), checks-effects-
interactions, `immutable` for wiring, append-only message/mail logs, paginated
reads to avoid unbounded returns, and **only opaque pointers (CIDs) on-chain** —
never plaintext.

---

## IdentityRegistry

Root of the network. Binds an account to an X25519 encryption public key + a
Bulletin profile CID.

**Storage**
- `mapping(address => Profile) _profiles` (private)
- `address personhoodAttester`, `address owner`
- `struct Profile { bytes32 encryptionPubKey; string profileCid; bool personhood; uint64 registeredAt; }`

**Functions**
| Signature | Access | Effect / reverts |
|---|---|---|
| `register(bytes32 encryptionPubKey, string profileCid)` | any | sets profile; `registeredAt` on first call. Reverts `EmptyKey` if key == 0. Emits `Registered`. |
| `updateProfile(string profileCid)` | registered | updates CID. `require("not registered")`. Emits `ProfileUpdated`. |
| `attestPersonhood(address account, bool value)` | `personhoodAttester` | legacy flag. Reverts `NotAttester`. Emits `PersonhoodAttested`. |
| `setAttester(address)` | `owner` | reverts `NotOwner`. |
| `isRegistered(address) → bool` · `profileOf(address) → Profile` · `encryptionKeyOf(address) → bytes32` | view | |

**Invariants**: `registeredAt != 0 ⇔ registered`. A non-zero `encryptionPubKey`
is required to receive DMs. (The `personhood` flag here is legacy; per-context
personhood lives in `Individuality`.)

---

## Individuality

Proof-of-personhood via unlinkable **contextual aliases** + **nullifiers**
(Gavin Wood's model; see [INDIVIDUALITY.md](INDIVIDUALITY.md)).

**Storage**
- `bytes32 peopleRoot` — commitment to the registered human set (People Chain).
- `address peopleChainBridge`, `address owner`, `IRingVrfVerifier verifier`
- `mapping(bytes32 ctx => mapping(address alias => Alias)) _aliases` (private)
- `mapping(bytes32 ctx => mapping(bytes32 nullifier => bool)) nullifierUsed`
- `struct Alias { uint8 dim; uint64 since; bool active; }`

**Functions**
| Signature | Access | Effect / reverts |
|---|---|---|
| `registerAlias(bytes32 context, bytes32 nullifier, uint8 dim, bytes proof)` | any (caller = alias) | `BadDim` if dim∉{1,2}; `NullifierUsed` if spent; `BadProof` if `verifier.verify(...)` false. Sets alias, spends nullifier. Emits `AliasRegistered`. |
| `revokeAlias(bytes32 context)` | alias owner | deactivates; nullifier stays spent. Emits `AliasRevoked`. |
| `setPeopleRoot(bytes32)` | `peopleChainBridge` | `NotBridge`. Emits `PeopleRootUpdated`. |
| `setBridge(address)` / `setVerifier(address)` | `owner` | `NotOwner`. |
| `isUnique(bytes32 ctx, address) → bool` · `dimOf(bytes32 ctx, address) → uint8` | view | `dimOf` returns 0 if inactive. |

**Invariants**: at most one active alias per `(person, context)` — enforced by
`nullifierUsed`, since the nullifier is deterministic per person+context.
Aliases in different contexts are unlinkable (different alias account +
nullifier; ring-VRF hides which member). **Security depends entirely on the
verifier** — `MockRingVrfVerifier` returns `true` (demo only).

---

## Messenger

Stores per-conversation append-only logs of **CID pointers** + minimal metadata.

**Storage**
- `IIdentityRegistry identity` (immutable), `IIndividuality individuality` (immutable)
- `mapping(bytes32 conversationId => Message[]) _threads` (private)
- `mapping(bytes32 channel => Channel) channels`
- `struct Message { address from; address to; bytes32 channel; string cid; uint64 sentAt; uint64 expiresAt; bool burned; }`
- `struct Channel { address admin; bool requiresPersonhood; uint8 minDim; string metadataCid; bool exists; }`

**Functions**
| Signature | Access | Effect / reverts |
|---|---|---|
| `dmId(address a, address b) → bytes32` | pure | symmetric id: `keccak256("dm", min, max)`. |
| `sendDirect(address to, string cid, uint64 ttlSeconds) → index` | any | `RecipientNotRegistered` if `to` lacks a key. Appends; `expiresAt = ttl==0?0:now+ttl`. Emits `MessageSent`. |
| `createChannel(bytes32 channel, bool requiresPersonhood, uint8 minDim, string metadataCid)` | any | `ChannelExists`. `minDim` floored to 1. Emits `ChannelCreated`. |
| `sendToChannel(bytes32 channel, string cid, uint64 ttlSeconds) → index` | any (gated) | `ChannelMissing`; if gated, `PersonhoodRequired` unless `individuality.dimOf(channel, sender) ≥ minDim` (**channel id = Individuality context**). Emits `MessageSent`. |
| `burn(bytes32 conversationId, uint256 index)` | message sender | `BadIndex` / `NotSender`. Sets `burned`, clears `cid`. Emits `MessageBurned`. |
| `messageCount(bytes32) → uint256` · `getMessages(bytes32, offset, limit) → Message[]` | view | bounded page. |

**Invariants**: logs are append-only; `burn` only blanks `cid`/sets `burned`
(history length preserved). Disappearing messages: `expiresAt` mirrors the
Bulletin retention deadline; the encrypted blob is pruned off-chain at TTL.

---

## Payments

In-chat native-token (DOT) transfers linked to a conversation.

**Storage**: `IIdentityRegistry identity` (immutable); `Tip[] tips`;
`mapping(address=>uint256) received, sent`;
`struct Tip { address from; address to; uint256 amount; bytes32 conversationId; string noteCid; uint64 sentAt; }`

**Functions**
| Signature | Access | Effect / reverts |
|---|---|---|
| `tip(address to, bytes32 conversationId, string noteCid) payable` | any | `ZeroAmount` if `msg.value==0`; `RecipientNotRegistered`. CEI: record → `received/sent` → `call{value}` → `TransferFailed` on failure. Emits `TipSent`. |
| `tipCount() → uint256` | view | |

**Invariants**: effects (accounting, event) precede the external transfer
(checks-effects-interactions); failed transfer reverts the whole tx.

---

## AnonymousMail

On-chain mailbox whose headline property is visible in storage: **no `from`
field anywhere**. Sender anonymity is structural.

**Storage**: `IIdentityRegistry identity` (immutable), `address owner`,
`mapping(address=>bool) relayer`, `mapping(address => Mail[]) _inbox`;
`struct Mail { string cid; uint64 deliveredAt; uint64 expiresAt; bool read; bool burned; }`

**Functions**
| Signature | Access | Effect / reverts |
|---|---|---|
| `deliver(address to, string cid, uint64 expiresAt) → index` | authorized `relayer` | `NotRelayer`; `RecipientNotRegistered`. Appends mail (no sender stored). Emits `MailDelivered`. |
| `setRelayer(address, bool)` | `owner` | `NotOwner`. Emits `RelayerSet`. |
| `markRead(uint256)` / `burn(uint256)` | recipient | `BadIndex`. `burn` blanks `cid`, sets `burned`. |
| `inboxCount(address) → uint256` · `getInbox(address, offset, limit) → Mail[]` | view | |

**Invariants**: only an authorized relay can deliver, so `msg.sender` is never
the author; the `Mail` struct has no field that could encode the sender. Author
unlinkability additionally relies on the relay being a TEE (see ACURAST.md).

---

## Events (for indexers)

`Registered`, `ProfileUpdated`, `PersonhoodAttested` ·
`AliasRegistered(ctx, alias, nullifier, dim)`, `AliasRevoked`, `PeopleRootUpdated` ·
`MessageSent(conversationId, from, to, channel, cid, expiresAt, index)`,
`MessageBurned`, `ChannelCreated` ·
`TipSent(id, from, to, amount, conversationId)` ·
`MailDelivered(to, index, cid, expiresAt)`, `MailRead`, `MailBurned`, `RelayerSet`.

ABIs (human-authored fragments used by the frontend) live in
`frontend/src/contracts/index.ts`; full ABIs are emitted to
`frontend/src/contracts/*.abi.json` by `scripts/deploy.ts`.
