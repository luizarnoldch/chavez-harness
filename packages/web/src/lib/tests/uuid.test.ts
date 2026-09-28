import { afterEach, describe, expect, test } from "bun:test";
import { randomId } from "../uuid";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("randomId", () => {
  const originalCrypto = globalThis.crypto;

  afterEach(() => {
    Object.defineProperty(globalThis, "crypto", {
      value: originalCrypto,
      configurable: true,
      writable: true,
    });
  });

  test("con randomUUID undefined usa getRandomValues (UUID v4)", () => {
    const getRandomValues = originalCrypto.getRandomValues.bind(originalCrypto);
    Object.defineProperty(globalThis, "crypto", {
      value: {
        getRandomValues,
        // simulate non-secure context (LAN HTTP)
        randomUUID: undefined,
      },
      configurable: true,
      writable: true,
    });

    const id = randomId();
    expect(id).toMatch(UUID_V4);
  });

  test("con randomUUID disponible lo usa", () => {
    const fixed = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    Object.defineProperty(globalThis, "crypto", {
      value: {
        randomUUID: () => fixed,
        getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto),
      },
      configurable: true,
      writable: true,
    });

    expect(randomId()).toBe(fixed);
  });
});
