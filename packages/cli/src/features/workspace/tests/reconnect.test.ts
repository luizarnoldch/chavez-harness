import { describe, expect, test } from "bun:test";
import { createBackoff } from "../ws/reconnect.ts";

describe("reconnect backoff", () => {
  test("increases then caps", () => {
    const backoff = createBackoff({ initialMs: 100, maxMs: 400, factor: 2 });
    expect(backoff.nextDelayMs()).toBe(100);
    expect(backoff.nextDelayMs()).toBe(200);
    expect(backoff.nextDelayMs()).toBe(400);
    expect(backoff.nextDelayMs()).toBe(400);
    backoff.reset();
    expect(backoff.nextDelayMs()).toBe(100);
  });
});
