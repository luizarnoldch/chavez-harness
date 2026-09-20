import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  clearCredentials,
  defaultApiUrl,
  loadCredentials,
  saveCredentials,
} from "../api/credentials.ts";

describe("credentials", () => {
  test("defaultApiUrl apunta al server publicado en 28001", () => {
    const prev = process.env.CHAVEZ_API_URL;
    delete process.env.CHAVEZ_API_URL;
    expect(defaultApiUrl()).toBe("http://localhost:28001");
    if (prev !== undefined) process.env.CHAVEZ_API_URL = prev;
  });

  test("save and load round-trip", async () => {
    const dir = await mkdtemp(join(tmpdir(), "chavez-creds-"));
    process.env.CHAVEZ_CREDENTIALS_PATH = join(dir, "credentials.json");

    await saveCredentials({
      apiUrl: "http://localhost:28001",
      sessionToken: "tok-123",
      email: "a@b.com",
    });

    const loaded = await loadCredentials();
    expect(loaded).toEqual({
      apiUrl: "http://localhost:28001",
      sessionToken: "tok-123",
      email: "a@b.com",
    });

    const raw = await readFile(process.env.CHAVEZ_CREDENTIALS_PATH, "utf8");
    expect(raw).toContain("tok-123");

    await clearCredentials();
    expect(await loadCredentials()).toBeNull();
  });
});
