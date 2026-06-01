# Contributing to Umbra

Thanks for wanting to build the web3 that was promised. A few ground rules keep
this codebase honest and reviewable.

## Principles (non-negotiable)
- **No plaintext on-chain.** Only opaque CIDs + minimal metadata.
- **No new trusted party** without saying so loudly (docs + PR description).
- **No KYC, no surveillance, no colour.** The UI is strictly black & white,
  flat, with soft corners. Privacy is the product.
- **Honesty over hype.** If something is a mock/scaffold, label it (see
  `MockRingVrfVerifier`, [PRODUCTION.md](docs/PRODUCTION.md)).

## Dev setup
```bash
npm install
npm run dev                      # frontend (demo mode)
npm test --workspace contracts   # 12/12
```

## Before you open a PR
- `npm test --workspace contracts` is green.
- Contracts compile to **EVM and PolkaVM**:
  `cd contracts && npx hardhat compile && npx resolc --bin -o ../.pvm contracts/*.sol contracts/interfaces/*.sol`
  (pin `pragma ^0.8.26` — resolc 0.3.0 bundles solc 0.8.26).
- `npm run build --workspace frontend` is green (type-check + build).
- If UI/behaviour changed: `npm run shots` (and `npm run video` if relevant).
- Fill in the PR template; flag any security/trust impact.

## Project layout
See the repo tree in the [README](README.md#repo-layout) and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Contract reference:
[docs/CONTRACTS.md](docs/CONTRACTS.md).

## Security
Do **not** open public issues for vulnerabilities — read [SECURITY.md](SECURITY.md).

## License
There is no license file by design. The work is shared in the spirit of the
[MANIFESTO](MANIFESTO.md): fork it, run your own node, ask no one's permission.
Contributions are accepted under the same terms. See [DISCLAIMER.md](DISCLAIMER.md).
