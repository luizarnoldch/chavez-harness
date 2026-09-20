import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Custom password hashing using scrypt via Node.js crypto.
 * Better Auth uses scrypt by default; this implementation
 * ensures proper salt management and timing-safe verification.
 */
export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  // Storage format: salt:hash
  return `${salt}:${derivedKey}`;
}

export async function verifyPassword(data: { password: string; hash: string }) {
  const [salt, key] = data.hash.split(":");
  if (!salt || !key) return false;

  const derivedKey = scryptSync(data.password, salt, KEY_LENGTH);
  const hashBuffer = Buffer.from(key, "hex");

  // Use timingSafeEqual to prevent timing attacks
  return timingSafeEqual(hashBuffer, derivedKey);
}
