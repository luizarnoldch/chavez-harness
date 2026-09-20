import { describe, expect, test } from "bun:test";
import {
  chatGenerateProgressPushSchema,
  chatGenerateProgressSchema,
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
});
