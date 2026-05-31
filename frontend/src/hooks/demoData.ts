import type { Conversation, Contact, MailMessage, WalletAsset, ContextAlias } from "../types";

/** People Chain root: commitment to the registered set of unique humans. */
export const PEOPLE_ROOT = "0x9a3f1c8b2e0d74651b9a0c2d4f6e8137a5c1e9f0b3d2a4c6e8f7190b2d4c6e8a1";

/** Local identity used until a wallet is connected. */
export const ME_FALLBACK: Contact = {
  address: "0x9F4e21aB7c0Db5e6F3120a1b2C3d4E5f60718293",
  name: "you",
  personhood: true,
};

const specter: Contact = {
  address: "0x1A2b3C4d5E6f7081920a1b2c3d4e5f6071829304",
  name: "specter",
  personhood: true,
};
const nyx: Contact = {
  address: "0xBEEFc0ffee00000000000000000000000000d07a",
  name: "nyx",
  personhood: true,
};

const m = 60_000;
const now = Date.now();

export const seedConversations: Conversation[] = [
  {
    id: "dm-specter",
    kind: "dm",
    title: specter.name,
    peer: specter,
    messages: [
      {
        id: "g1",
        from: specter.address,
        text: "welcome to umbra. content is E2E encrypted — only the CID hits the chain.",
        sentAt: now - 44 * m,
        cid: "bafy-demo-aa1",
        txHash: "0x4f9c2a7e51b0d83c6e1a9f0b2d4c8e7a3b5f1029d6c4a8e2f7b30915c8d6e4a2b",
      },
      {
        id: "g2",
        from: ME_FALLBACK.address,
        text: "so the blob lives on Bulletin Chain and Revive contracts keep the registry?",
        sentAt: now - 41 * m,
        cid: "bafy-demo-aa2",
        txHash: "0x8a1d6b3f0c92e7451a8c0d2f4b6e9173d5a7c1e8f0b294d6c3a5e7f1908b2d4c6",
      },
      {
        id: "g3",
        from: specter.address,
        text: "exactly. IdentityRegistry → keys, Messenger → pointers, Payments → DOT. all interconnected.",
        sentAt: now - 39 * m,
        cid: "bafy-demo-aa3",
        txHash: "0x2c7e4a9b1f0d6358e2a1c0b3d5f7948a6c1e3f0b8d2a4c6e5f719032b8d6e4a1c",
      },
      {
        id: "g4",
        from: specter.address,
        text: "this one self-destructs in 1h — Bulletin just won't renew it.",
        sentAt: now - 6 * m,
        cid: "bafy-demo-aa4",
        ttlSec: 3600,
        txHash: "0x9b3f1c8a2e0d74651b9a0c2d4f6e8137a5c1e9f0b3d2a4c6e8f7190b2d4c6e8a1",
      },
    ],
  },
  {
    id: "dm-nyx",
    kind: "dm",
    title: nyx.name,
    peer: nyx,
    messages: [
      {
        id: "t1",
        from: nyx.address,
        text: "sending 5 PAS for the coretime test ⚡",
        sentAt: now - 14 * m,
        cid: "bafy-demo-bb1",
        txHash: "0x6e1a9f0b2d4c8e7a3b5f1029d6c4a8e2f7b30915c8d6e4a2b4f9c2a7e51b0d83c",
      },
      {
        id: "t2",
        from: nyx.address,
        text: "tip sent",
        sentAt: now - 14 * m + 3000,
        cid: "—",
        tip: { amount: "5", symbol: "PAS" },
        txHash: "0x1f0d6358e2a1c0b3d5f7948a6c1e3f0b8d2a4c6e5f719032b8d6e4a1c2c7e4a9b",
      },
    ],
  },
  {
    id: "ch-builders",
    kind: "channel",
    title: "cypherpunks",
    requiresPersonhood: true,
    messages: [
      {
        id: "c1",
        from: specter.address,
        text: "human-verified channel (Individuality). no bots, no spam.",
        sentAt: now - 180 * m,
        cid: "bafy-demo-cc1",
        txHash: "0xd5a7c1e8f0b294d6c3a5e7f1908b2d4c68a1d6b3f0c92e7451a8c0d2f4b6e9173",
      },
    ],
  },
];

export const seedMail: MailMessage[] = [
  {
    id: "mail-1",
    subject: "whistleblower drop — coretime pricing",
    body: "Attached analysis shows the pricing anomaly. Sent through the Acurast relay so you can't trace me. Verify the CID on Bulletin before it expires.",
    receivedAt: now - 26 * m,
    cid: "bafy-mail-001",
    txHash: "0x3b5f1029d6c4a8e2f7b30915c8d6e4a2b4f9c2a7e51b0d83c6e1a9f0b2d4c8e7a",
    relay: "acu-proc:7F3A…D21",
    ttlSec: 1209600,
    read: false,
  },
  {
    id: "mail-2",
    subject: "re: grant milestone 3",
    body: "Confirmed. Funds routed. This thread is anonymous on both ends — neither relay operator can see who we are.",
    receivedAt: now - 5 * 60 * m,
    cid: "bafy-mail-002",
    txHash: "0xc1e3f0b8d2a4c6e5f719032b8d6e4a1c2c7e4a9b1f0d6358e2a1c0b3d5f7948a6",
    relay: "acu-proc:91C0…4E7",
    ttlSec: 1209600,
    read: true,
  },
];

export const seedAliases: ContextAlias[] = [
  {
    id: "al-1",
    context: "#cypherpunks",
    alias: "0x7b3e…91a4",
    nullifier: "0xnf:4f9c2a7e…d6c4a8e2",
    dim: 1,
    since: now - 3 * 24 * 60 * m,
    txHash: "0x2c7e4a9b1f0d6358e2a1c0b3d5f7948a6c1e3f0b8d2a4c6e8f719032b8d6e4a1c",
  },
  {
    id: "al-2",
    context: "opengov.referendum",
    alias: "0xc0ff…ee21",
    nullifier: "0xnf:8a1d6b3f…0c92e745",
    dim: 2,
    since: now - 9 * 24 * 60 * m,
    txHash: "0x6e1a9f0b2d4c8e7a3b5f1029d6c4a8e2f7b30915c8d6e4a2b4f9c2a7e51b0d83c",
  },
];

export const seedAssets: WalletAsset[] = [
  { symbol: "DOT", name: "Polkadot", balance: "184.205", fiat: "$1,284.61" },
  { symbol: "PAS", name: "Paseo (testnet)", balance: "920.00", fiat: "$0.00" },
  { symbol: "USDC", name: "USD Coin", balance: "512.40", fiat: "$512.40" },
  { symbol: "ACU", name: "Acurast", balance: "3,401.7", fiat: "$408.20" },
];
