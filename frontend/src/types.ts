export type ViewKey =
  | "messages"
  | "mail"
  | "wallet"
  | "individuality"
  | "network"
  | "settings";

/** A contextual alias from Project Individuality: an unlinkable per-context
 *  pseudonym, proven to belong to a unique human via a ring-VRF + nullifier. */
export interface ContextAlias {
  id: string;
  context: string; // human-readable context label (e.g. "#cypherpunks")
  alias: string; // derived alias account (unlinkable across contexts)
  nullifier: string; // ring-VRF nullifier bound to (person, context)
  dim: 1 | 2; // DIM1 = Proof of Individuality, DIM2 = Proof of Verified Individuality
  since: number;
  txHash: string;
}

export interface Contact {
  address: string;
  name: string;
  personhood: boolean;
}

export interface ChatMessage {
  id: string;
  from: string;
  text: string;
  sentAt: number;
  cid: string; // Bulletin Chain pointer
  txHash?: string; // simulated on-chain tx
  ttlSec?: number; // disappearing message (Bulletin retention)
  burned?: boolean;
  pending?: boolean;
  tip?: { amount: string; symbol: string };
}

export interface Conversation {
  id: string;
  kind: "dm" | "channel";
  title: string;
  peer?: Contact;
  requiresPersonhood?: boolean;
  messages: ChatMessage[];
}

export interface MailMessage {
  id: string;
  subject: string;
  body: string;
  receivedAt: number;
  cid: string;
  txHash: string;
  relay: string; // Acurast processor id (cosmetic)
  ttlSec: number;
  read: boolean;
  burned?: boolean;
  outbound?: boolean; // sent by me (anonymously)
}

export interface WalletAsset {
  symbol: string;
  name: string;
  balance: string;
  fiat: string; // USD value, formatted
}
