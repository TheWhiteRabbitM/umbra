# Architecture

Umbra is a monorepo: a Solidity contract network on Polkadot Hub + a React
frontend. Content storage is the Bulletin Chain; confidential off-chain work is
(planned) Acurast.

## Contract network (Revive / PolkaVM)

All four contracts are plain Solidity compiled to PolkaVM via `resolc`. They are
intentionally small and auditable.

```
IdentityRegistry  (root)
   ├── encryptionKeyOf / isRegistered / profileOf / personhood
   │
   ├──◀ Messenger        sendDirect(to, cid, ttl) · sendToChannel · burn
   │        reads IdentityRegistry to require recipient keys and gate channels
   │
   ├──◀ Payments         tip(to, conversationId, noteCid) payable
   │        reads IdentityRegistry to validate recipients
   │
   └──◀ AnonymousMail    deliver(to, cid, ttl)  ← only authorized relayers
            no sender field stored; recipient can markRead / burn
```

**Why on-chain stores only pointers.** The chain is the index and the access-
control/authorization layer. The bytes live off-chain (Bulletin), keeping gas
low and enabling real deletion.

## Storage: Bulletin Chain

- Write-to-chain, read-from-network. `store` → CID; fetch via IPFS gateway /
  Bitswap / Helia.
- **Prunable**: data has a retention period and is removed unless `renew`d. This
  is the deletion primitive (`expiresAt` / `burn` on-chain mirror it).
- No token, no fees — authorization-based (faucet on TestNet).

## Confidential compute: Acurast (planned)

TEE relays provide sender anonymity for mail and run private scheduled jobs and
push. Full proposal in [ACURAST.md](ACURAST.md).

## Frontend

- **State**: a single `useApp()` store (wallet, derived E2E keypair, simulated
  chain, conversations, mail, wallet assets).
- **Crypto**: `lib/crypto.ts` (NaCl box). **Wallet**: `lib/wallet.ts` (EIP-1193
  → Polkadot Hub). **Storage**: `lib/bulletin.ts` (mock + real-client stub).
  **Simulated chain**: `lib/chain.ts` (tx hashes, live block height, fees).
- **UI**: monochrome terminal/brutalist. Mobile-first (bottom tab bar) with a
  desktop rail + activity aside above 880/1180px. `⌘K` command palette.
- **Demo ↔ live**: `contractsDeployed()` flips behavior once
  `addresses.local.json` holds real addresses.

## Data flow: sending a message

```
type → encryptFor(recipientKey)        // NaCl box, client-side
     → bulletin.put(ciphertext)        // → CID (Bulletin Chain)
     → Messenger.sendDirect(to, cid, ttl)   // only the CID + TTL go on-chain
     → MessageSent event               // peers read & decrypt with their key
```
