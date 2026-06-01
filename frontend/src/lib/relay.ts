import { getIdentity } from "../contracts";
import { encryptFor, bytes32ToPubKey } from "./crypto";
import type { Provider, Signer } from "ethers";

/**
 * Anonymous-mail relay client.
 *
 * The author seals the message to the recipient's key (read from
 * IdentityRegistry) and hands the opaque blob to an Acurast TEE relay over an
 * anonymized channel. The relay — not the author — submits it on-chain, so the
 * sender is unlinkable. See acurast/relay.job.ts.
 *
 * The relay endpoint is configured via VITE_ACURAST_RELAY_URL. With no endpoint
 * set, live anonymous mail is unavailable (demo mode simulates it instead).
 */

const RELAY_URL = import.meta.env.VITE_ACURAST_RELAY_URL ?? "";

export function relayConfigured(): boolean {
  return RELAY_URL.length > 0;
}

export interface SealedMail {
  to: string;
  sealed: unknown; // ciphertext sealed to recipient key
  ttlSeconds: number;
}

/** Seal a mail body to the recipient's encryption key (no plaintext leaves the client). */
export async function sealMail(
  runner: Signer | Provider,
  to: string,
  subject: string,
  body: string,
  ttlSeconds = 1209600,
): Promise<SealedMail> {
  const keyHex: string = await getIdentity(runner).encryptionKeyOf(to);
  const recipientKey = bytes32ToPubKey(keyHex);
  const sealed = encryptFor(JSON.stringify({ subject, body, v: 1 }), recipientKey);
  return { to, sealed, ttlSeconds };
}

/** Submit a sealed mail to the Acurast TEE relay. Returns the relay's response. */
export async function submitToRelay(mail: SealedMail): Promise<{ ok: boolean; index?: number }> {
  if (!relayConfigured()) throw new Error("no Acurast relay configured (VITE_ACURAST_RELAY_URL)");
  const res = await fetch(RELAY_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mail),
  });
  if (!res.ok) throw new Error(`relay error ${res.status}`);
  return res.json();
}

/** Seal + submit in one call (live anonymous mail send). */
export async function sendAnonymousMail(
  runner: Signer | Provider,
  to: string,
  subject: string,
  body: string,
  ttlSeconds?: number,
): Promise<{ ok: boolean; index?: number }> {
  const sealed = await sealMail(runner, to, subject, body, ttlSeconds);
  return submitToRelay(sealed);
}
