import { describe, expect, test } from "bun:test";
import type { ChatSessionWithMessagesDto } from "@chavez-harness/shared";
import { LOCAL_MODEL } from "../model";
import { sessionFromDto, shortSessionId } from "../store";

describe("sessionFromDto", () => {
  test("mapea mensajes user/assistant a turns", () => {
    const dto: ChatSessionWithMessagesDto = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      title: "hola",
      mode: "build",
      provider: "local",
      model: LOCAL_MODEL,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      messages: [
        {
          id: "m1",
          chatSessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          role: "user",
          mode: "build",
          provider: "local",
          model: LOCAL_MODEL,
          status: "done",
          error: null,
          parts: [{ type: "text", text: "hola" }],
          usage: null,
          clientMessageId: "cid-user-1",
          seq: 1,
          createdAt: new Date().toISOString(),
        },
        {
          id: "m2",
          chatSessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          role: "assistant",
          mode: "build",
          provider: "local",
          model: LOCAL_MODEL,
          status: "done",
          error: null,
          parts: [{ type: "text", text: "hola" }],
          usage: null,
          clientMessageId: null,
          seq: 2,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const session = sessionFromDto(dto);
    expect(shortSessionId(session.id)).toBe("aaaaaaaa");
    expect(session.turns).toEqual([
      expect.objectContaining({
        role: "user",
        text: "hola",
        mode: "build",
        clientMessageId: "cid-user-1",
      }),
      expect.objectContaining({
        role: "assistant",
        text: "hola",
        status: "done",
        model: LOCAL_MODEL,
        toolCalls: [],
      }),
    ]);
  });

  test("mapea tool-call parts a toolCalls del turn", () => {
    const dto: ChatSessionWithMessagesDto = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      title: null,
      mode: "plan",
      provider: "cursor",
      model: "auto",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: null,
      messages: [
        {
          id: "m1",
          chatSessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          role: "assistant",
          mode: "plan",
          provider: "cursor",
          model: "auto",
          status: "done",
          error: null,
          parts: [
            {
              type: "tool-call",
              id: "tc-1",
              name: "read",
              args: { path: "a.ts" },
              result: "ok",
            },
            { type: "text", text: "listo" },
          ],
          usage: null,
          clientMessageId: null,
          seq: 1,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const session = sessionFromDto(dto);
    expect(session.turns[0]).toEqual(
      expect.objectContaining({
        role: "assistant",
        text: "listo",
        toolCalls: [
          {
            type: "tool-call",
            id: "tc-1",
            name: "read",
            args: { path: "a.ts" },
            result: "ok",
          },
        ],
      }),
    );
  });
});
