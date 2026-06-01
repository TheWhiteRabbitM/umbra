# Umbra — presentation & video script

**Go dark. Stay human.** Encrypted messaging, anonymous on-chain mail, and a
non-custodial wallet on Polkadot — gated by proof of *personhood*, not proof of
wealth.

- 🎬 **Promo film (16:9)**: [`docs/media/umbra-promo.webm`](media/umbra-promo.webm)
  — animated copy + floating phone mockup, ~35s, 7 scenes (`npm run promo`).
  Poster: `docs/media/promo-poster.png`.
- 🎬 **Mobile video** (in-device): [`docs/media/umbra-demo-mobile.webm`](media/umbra-demo-mobile.webm)
  — raw walkthrough (`npm run mockup`).
- 🎬 **Desktop video**: [`docs/media/umbra-demo.webm`](media/umbra-demo.webm) (`npm run video`).
- 🖼️ **Phone-mockup stills**: `docs/media/mock-mobile-*.png` (`npm run mockup`).
- 🖼️ **Desktop stills**: [SHOWCASE.md](SHOWCASE.md) and the README grid (`npm run shots`).

> The walkthrough runs in **demo mode**: real client-side cryptography with
> simulated on-chain transactions, so every feature is demonstrable without funds.

## One-liner

> Umbra is a privacy super-app on Polkadot: Signal-grade messaging, a Nova-style
> wallet, and senderless on-chain mail — where you prove you're a unique *human*
> (Individuality), not how many tokens you hold.

## Promo film — 7 scenes (the on-screen copy)

Each scene ≈ 5s. Animated word-by-word headline + tech chips, beside the
floating phone showing the matching screen.

| # | Kicker | Headline | Subline | Chips | Phone |
|---|--------|----------|---------|-------|-------|
| 01 | Umbra · on Polkadot | **Go dark. Stay human.** | Encrypted messaging, anonymous mail and a non-custodial wallet — where you prove you're real, not rich. | encrypted · anonymous · non-custodial | messages |
| 02 | End to end | **The chain sees a hash, not a word.** | Every message is sealed on your device. Only an opaque CID ever touches Polkadot. | NaCl box · X25519 · client-side | thread |
| 03 | Built to be forgotten | **Messages that self-destruct.** | Content lives on the Bulletin Chain and is pruned at expiry — deletion enforced by the protocol, not a promise. | Bulletin Chain · prunable · TTL | thread |
| 04 | No return address | **Mail no one can trace.** | Anonymous on-chain mail, relayed through hardware enclaves. There is no sender field. Ever. | Acurast · TEE relays · senderless | mail |
| 05 | Proof of personhood | **One human. No identity.** | Prove you're a unique person with unlinkable contextual aliases. Sybil-resistant, with zero KYC. | Individuality · ring-VRF · nullifiers | personhood |
| 06 | Self-sovereign | **Your keys. Your exit.** | A non-custodial wallet, light-client first. No server to seize, no founder to trust. | Revive/PolkaVM · light client · no custody | wallet |
| 07 | Umbra | **Step into the umbra.** | Talk and transact without leaving a trace. | DisParity Team · × · Claude Code | network |

> Edit copy/scenes in `scripts/promo.mjs` (the `SCENES` array) and re-run
> `npm run promo`.

## Key talking points (for posts / decks)

- **For people, not whales.** Access and anti-spam come from *personhood*
  (Individuality / DIM1–DIM2), not token balances.
- **Real deletion.** Content lives on the **Bulletin Chain**, which *prunes* at
  TTL — the right to be forgotten, enforced by the protocol, not a policy.
- **Structural anonymity.** `AnonymousMail` stores **no sender field**; relays
  run in TEEs (Acurast).
- **Verifiable substance.** Contracts compile to **EVM and PolkaVM** and pass
  **12/12** tests; see [PRODUCTION.md](PRODUCTION.md) and [AUDIT.md](AUDIT.md).
- **Non-custodial, light-client-first.** Your keys; no RPC overlord.

## Regenerate

```bash
npm run dev        # start the app (terminal 1)
npm run shots      # desktop stills → docs/media/*.png
npm run video      # desktop walkthrough → docs/media/umbra-demo.webm
npm run mockup     # phone-framed stills + MOBILE video → docs/media/mock-mobile-*.png, umbra-demo-mobile.webm
npm run promo      # 16:9 PROMO film + poster → docs/media/umbra-promo.webm, promo-poster.png  (no dev server)
```

> Note: `npm run video` needs Playwright's ffmpeg once: `npx playwright install ffmpeg`.
> The bundled ffmpeg is a minimal VP8 build (no MP4/GIF export); use a full
> ffmpeg if you need other formats.
