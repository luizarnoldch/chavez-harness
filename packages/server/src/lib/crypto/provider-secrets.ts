import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_VERSION = 1;

export type EncryptedSecret = {
  ciphertext: string;
  nonce: string;
  keyVersion: number;
  hint: string;
};

export function secretHint(apiKey: string): string {
  if (apiKey.length <= 4) return apiKey;
  return apiKey.slice(-4);
}

/** Derive a 32-byte AES key from the configured secret material. */
export function deriveEncryptionKey(secretMaterial: string): Buffer {
  return createHash("sha256").update(secretMaterial, "utf8").digest();
}

export function encryptSecret(apiKey: string, secretMaterial: string): EncryptedSecret {
  const key = deriveEncryptionKey(secretMaterial);
  const nonce = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, nonce);
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString("base64"),
    nonce: nonce.toString("base64"),
    keyVersion: KEY_VERSION,
    hint: secretHint(apiKey),
  };
}

export function decryptSecret(
  payload: Pick<EncryptedSecret, "ciphertext" | "nonce">,
  secretMaterial: string,
): string {
  const key = deriveEncryptionKey(secretMaterial);
  const raw = Buffer.from(payload.ciphertext, "base64");
  if (raw.length < 17) {
    throw new Error("Invalid ciphertext");
  }
  const encrypted = raw.subarray(0, raw.length - 16);
  const tag = raw.subarray(raw.length - 16);
  const nonce = Buffer.from(payload.nonce, "base64");
  const decipher = createDecipheriv(ALGO, key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
