import { describe, expect, test } from "bun:test";
import { resolveProviderReply } from "../src/services/resolve-provider-reply.ts";

const baseCtx = {
  model: "gpt-5",
  text: "hola",
  workspaceId: "11111111-1111-4111-8111-111111111111",
  workspacePath: "/tmp/ws",
  userId: "22222222-2222-4222-8222-222222222222",
  sessionId: "33333333-3333-4333-8333-333333333333",
  mode: "plan" as const,
};

const stubDeps = {
  hub: {} as never,
  pending: {} as never,
  jobs: {} as never,
  providers: {
    isConfigured: async () => false,
  } as never,
};

describe("resolveProviderReply", () => {
  test("openai/antropic/grok return AI SDK stub error", async () => {
    for (const provider of ["openai", "antropic", "grok"] as const) {
      await expect(
        resolveProviderReply({ ...baseCtx, provider }, stubDeps),
      ).rejects.toThrow(/AI SDK en server/);
    }
  });

  test("unknown provider errors", async () => {
    await expect(
      resolveProviderReply({ ...baseCtx, provider: "deepseek" }, stubDeps),
    ).rejects.toThrow(/no implementado/i);
  });

  test("cursor without key errors", async () => {
    await expect(
      resolveProviderReply({ ...baseCtx, provider: "cursor" }, stubDeps),
    ).rejects.toThrow(/API key de Cursor/);
  });
});
