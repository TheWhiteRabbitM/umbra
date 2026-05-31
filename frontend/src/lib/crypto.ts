import nacl from "tweetnacl";
import {
  decodeBase64,
  decodeUTF8,
  encodeBase64,
  encodeUTF8,
} from "tweetnacl-util";

/**
 * End-to-end encryption for Umbra messages.
 *
 * Plaintext never touches the chain: content is encrypted with NaCl box
 * (Curve25519 + XSalsa20-Poly1305) and stored on the Bulletin Chain; only the
 * CID goes on-chain. The recipient's public key is read from IdentityRegistry.
 *
 * The encryption private key is derived deterministically from a wallet
 * signature (see deriveEncryptionKeypair), so the user doesn't manage a second
 * secret and nothing is custodied by a server.
 */

export interface EncryptedPayload {
  v: 1;
  nonce: string; // base64
  ephemeralPubKey: string; // base64
  ciphertext: string; // base64
}

export type KeyPair = nacl.BoxKeyPair;

/** Derive a stable X25519 keypair from a wallet signature (32-byte seed). */
export function deriveEncryptionKeypair(signatureHex: string): KeyPair {
  const seedBytes = hexToBytes(signatureHex).slice(0, 32);
  return nacl.box.keyPair.fromSecretKey(seedBytes);
}

/** Fixed message the user signs once to derive their E2E key. */
export const KEY_DERIVATION_MESSAGE =
  "Umbra — sign to derive your end-to-end encrypted messaging key. This signature does not authorize any transaction.";

/** Encrypt `plaintext` for `recipientPubKey` using an ephemeral keypair (forward secrecy). */
export function encryptFor(plaintext: string, recipientPubKey: Uint8Array): EncryptedPayload {
  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const box = nacl.box(decodeUTF8(plaintext), nonce, recipientPubKey, ephemeral.secretKey);
  return {
    v: 1,
    nonce: encodeBase64(nonce),
    ephemeralPubKey: encodeBase64(ephemeral.publicKey),
    ciphertext: encodeBase64(box),
  };
}

/** Decrypt a payload addressed to `mySecretKey`. Returns null on auth failure. */
export function decryptWith(payload: EncryptedPayload, mySecretKey: Uint8Array): string | null {
  const opened = nacl.box.open(
    decodeBase64(payload.ciphertext),
    decodeBase64(payload.nonce),
    decodeBase64(payload.ephemeralPubKey),
    mySecretKey,
  );
  return opened ? encodeUTF8(opened) : null;
}

// ── bytes32 ↔ public key helpers ─────────────────────────────────────────────

/** The X25519 public key (32 bytes) goes on-chain as bytes32. */
export function pubKeyToBytes32(pubKey: Uint8Array): string {
  return "0x" + bytesToHex(pubKey);
}

export function bytes32ToPubKey(hex: string): Uint8Array {
  return hexToBytes(hex);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
