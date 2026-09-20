import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCredentials } from "./credentials.ts";
import { signIn, signUp } from "./api.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.CHAVEZ_CREDENTIALS_PATH;
});

async function withTempCredentials() {
  const dir = await mkdtemp(join(tmpdir(), "chavez-auth-"));
  process.env.CHAVEZ_CREDENTIALS_PATH = join(dir, "credentials.json");
}

describe("signIn / signUp", () => {
  test("signIn guarda token desde set-auth-token", async () => {
    await withTempCredentials();

    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({ user: { email: "a@b.com" } }), {
        status: 200,
        headers: { "set-auth-token": "session-token-login" },
      });
    }) as unknown as typeof fetch;

    const creds = await signIn("a@b.com", "password123", "http://localhost:28001");
    expect(creds.sessionToken).toBe("session-token-login");
    expect(await loadCredentials()).toMatchObject({
      sessionToken: "session-token-login",
      email: "a@b.com",
    });
  });

  test("signUp guarda token tras registro", async () => {
    await withTempCredentials();

    globalThis.fetch = mock(async (input) => {
      expect(String(input)).toContain("/api/auth/sign-up/email");
      return new Response(JSON.stringify({ user: { email: "nuevo@b.com" } }), {
        status: 200,
        headers: { "set-auth-token": "session-token-signup" },
      });
    }) as unknown as typeof fetch;

    const creds = await signUp(
      { name: "Nuevo", email: "nuevo@b.com", password: "password123" },
      "http://localhost:28001",
    );
    expect(creds.sessionToken).toBe("session-token-signup");
    expect(await loadCredentials()).toMatchObject({
      sessionToken: "session-token-signup",
      email: "nuevo@b.com",
    });
  });

  test("signUp propaga error del servidor", async () => {
    await withTempCredentials();

    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({ message: "User already exists" }), {
        status: 400,
      });
    }) as unknown as typeof fetch;

    await expect(
      signUp(
        { name: "Dup", email: "dup@b.com", password: "password123" },
        "http://localhost:28001",
      ),
    ).rejects.toThrow("User already exists");
  });

  test("signIn propaga error del servidor", async () => {
    await withTempCredentials();

    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({ message: "Invalid credentials" }), {
        status: 401,
      });
    }) as unknown as typeof fetch;

    await expect(signIn("a@b.com", "bad", "http://localhost:28001")).rejects.toThrow(
      "Invalid credentials",
    );
  });

  test("signIn traduce error de red con la URL", async () => {
    await withTempCredentials();

    globalThis.fetch = mock(async () => {
      throw new Error("Unable to connect. Is the computer able to access the url?");
    }) as unknown as typeof fetch;

    await expect(signIn("a@b.com", "password123", "http://localhost:28001")).rejects.toThrow(
      "No se pudo conectar a http://localhost:28001. ¿Está el server arriba?",
    );
  });
});
