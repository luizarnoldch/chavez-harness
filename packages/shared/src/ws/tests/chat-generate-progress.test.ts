import { describe, expect, test } from "bun:test";
import {
  chatGenerateProgressPushSchema,
  chatGenerateProgressSchema,
  chatGenerateResultSchema,
  incomingWsMessageSchema,
} from "../protocol.ts";

describe("chat.generate.progress protocol", () => {
  test("parse daemon progress message", () => {
    const parsed = chatGenerateProgressSchema.parse({
      type: "chat.generate.progress",
      requestId: "req-1",
      workspaceId: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222",
      phase: "reasoning",
    });
    expect(parsed.phase).toBe("reasoning");
  });

  test("parse push with textDelta", () => {
    const parsed = chatGenerateProgressPushSchema.parse({
      push: true,
      eventId: "e1",
      type: "chat.generate.progress",
      data: {
        requestId: "req-1",
        workspaceId: "11111111-1111-4111-8111-111111111111",
        sessionId: "22222222-2222-4222-8222-222222222222",
        phase: "streaming",
        textDelta: "hola",
      },
    });
    expect(parsed.data.textDelta).toBe("hola");
  });

  test("parse progress with toolCall", () => {
    const parsed = chatGenerateProgressSchema.parse({
      type: "chat.generate.progress",
      requestId: "req-1",
      workspaceId: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222",
      phase: "tool",
      toolCall: {
        id: "tc-1",
        name: "read",
        status: "running",
        args: { path: "foo.ts" },
      },
    });
    expect(parsed.toolCall?.name).toBe("read");
    expect(parsed.toolCall?.status).toBe("running");
  });

  test("incomingWsMessageSchema accepts progress with realistic toolCall", () => {
    const result = incomingWsMessageSchema.safeParse({
      type: "chat.generate.progress",
      requestId: "req-1",
      workspaceId: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222",
      phase: "tool",
      toolCall: {
        id: "tc-read-1",
        name: "read",
        status: "completed",
        args: {
          path: "packages/cli/src/app/Shell.tsx",
          offset: 10,
        },
        result: "export function Shell() { … }",
      },
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "chat.generate.progress") {
      expect(result.data.toolCall?.name).toBe("read");
      expect(result.data.toolCall?.args?.path).toBe(
        "packages/cli/src/app/Shell.tsx",
      );
    }
  });

  test("parse result with parts", () => {
    const parsed = chatGenerateResultSchema.parse({
      type: "chat.generate.result",
      requestId: "req-1",
      ok: true,
      data: {
        text: "listo",
        agentId: "agent-1",
        parts: [
          {
            type: "tool-call",
            id: "tc-1",
            name: "read",
            args: { path: "foo.ts" },
            result: "ok",
          },
          { type: "text", text: "listo" },
        ],
      },
    });
    expect(parsed.data?.parts).toHaveLength(2);
  });
});
