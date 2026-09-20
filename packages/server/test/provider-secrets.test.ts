import { describe, expect, test } from "bun:test";
import {
  decryptSecret,
  encryptSecret,
  secretHint,
} from "../src/lib/crypto/provider-secrets.ts";

describe("provider-secrets crypto", () => {
  test("roundtrip encrypt/decrypt", () => {
    const key = "test-encryption-material";
    const apiKey = "cursor_sk_test_abcdefghijklmnopqrstuvwxyz";
    const enc = encryptSecret(apiKey, key);
    expect(enc.hint).toBe(secretHint(apiKey));
    expect(enc.ciphertext).not.toContain(apiKey);
    expect(decryptSecret(enc, key)).toBe(apiKey);
  });

  test("wrong key fails", () => {
    const enc = encryptSecret("secret-value", "key-a");
    expect(() => decryptSecret(enc, "key-b")).toThrow();
  });
});
