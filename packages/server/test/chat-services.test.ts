import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { user } from "../src/db/auth/auth-schema.ts";
import { chatMessage, chatSession, workspace } from "../src/db/chat/schema.ts";
import db from "../src/lib/db.ts";
import { createChatService, createWorkspaceService } from "../src/services/chat.ts";
import { createHub } from "../src/ws/hub.ts";
import { createPendingRegistry } from "../src/ws/pending.ts";
import { createProviderJobStore } from "../src/services/provider-jobs.ts";
import { resolveProviderReply } from "../src/services/resolve-provider-reply.ts";

const TEST_EMAIL = `chat-svc-${Date.now()}@test.local`;

describe("chat services (db)", () => {
  let userId: string;

  beforeAll(async () => {
    const [row] = await db
      .insert(user)
      .values({
        name: "Chat Test",
        email: TEST_EMAIL,
        emailVerified: true,
      })
      .returning();
    userId = row!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, userId));
  });

  test("defaults are cursor/auto; local echo still works when opted in", async () => {
    const workspaces = createWorkspaceService(db);
    const chat = createChatService(db);

    const ws = await workspaces.upsertByPath(userId, `/tmp/chat-test-${Date.now()}`);
    expect(ws.userId).toBe(userId);

    const again = await workspaces.upsertByPath(userId, ws.path);
    expect(again.id).toBe(ws.id);

    const session = await chat.getLatestOrCreate(userId, ws.id);
    expect(session.messages).toEqual([]);
    expect(session.provider).toBe("cursor");
    expect(session.model).toBe("auto");

    const localSession = await chat.createSession(userId, ws.id, {
      provider: "local",
      model: "eco",
    });

    const result = await chat.sendMessage({
      chatSessionId: localSession.id,
      userId,
      text: "hola sync",
      mode: "plan",
      provider: "local",
      model: "eco",
      clientMessageId: "cid-1",
    });

    expect(result.created).toBe(true);
    expect(result.userMessage.parts).toEqual([{ type: "text", text: "hola sync" }]);
    expect(result.assistantMessage.parts).toEqual([{ type: "text", text: "hola sync" }]);

    const idempotent = await chat.sendMessage({
      chatSessionId: localSession.id,
      userId,
      text: "hola sync",
      mode: "plan",
      provider: "local",
      model: "eco",
      clientMessageId: "cid-1",
    });
    expect(idempotent.created).toBe(false);
    expect(idempotent.userMessage.id).toBe(result.userMessage.id);

    const loaded = await chat.getSessionWithMessages(userId, localSession.id);
    expect(loaded.messages).toHaveLength(2);

    await db.delete(chatMessage).where(eq(chatMessage.chatSessionId, session.id));
    await db.delete(chatSession).where(eq(chatSession.id, session.id));
    await db.delete(chatMessage).where(eq(chatMessage.chatSessionId, localSession.id));
    await db.delete(chatSession).where(eq(chatSession.id, localSession.id));
    await db.delete(workspace).where(eq(workspace.id, ws.id));
  });

  test("error keyword yields assistant error status", async () => {
    const workspaces = createWorkspaceService(db);
    const chat = createChatService(db);
    const ws = await workspaces.upsertByPath(userId, `/tmp/chat-err-${Date.now()}`);
    const session = await chat.createSession(userId, ws.id, {
      provider: "local",
      model: "eco",
    });
    const result = await chat.sendMessage({
      chatSessionId: session.id,
      userId,
      text: "error",
      mode: "plan",
      provider: "local",
      model: "eco",
    });
    expect(result.assistantMessage.status).toBe("error");
    await db.delete(chatMessage).where(eq(chatMessage.chatSessionId, session.id));
    await db.delete(chatSession).where(eq(chatSession.id, session.id));
    await db.delete(workspace).where(eq(workspace.id, ws.id));
  });

  test("cursor generate persists agentId across turns", async () => {
    const workspaces = createWorkspaceService(db);
    const chat = createChatService(db);
    const hub = createHub();
    const pending = createPendingRegistry();
    const jobs = createProviderJobStore();

    const ws = await workspaces.upsertByPath(userId, `/tmp/chat-cursor-${Date.now()}`);
    const session = await chat.createSession(userId, ws.id);

    const daemonConnId = "daemon-conn-1";
    const sent: unknown[] = [];
    hub.register({
      connectionId: daemonConnId,
      userId,
      socket: {
        send: (data: string) => {
          sent.push(JSON.parse(data));
        },
        close: () => {},
      },
      clientKind: "daemon",
      workspaceId: ws.id,
      workspacePath: ws.path,
      daemonId: "daemon-1",
      role: "primary",
      machineId: null,
      hostname: null,
      lastHeartbeatAt: Date.now(),
    });

    let dispatchCount = 0;
    const originalSendTo = hub.sendTo.bind(hub);
    hub.sendTo = (connectionId, message) => {
      const ok = originalSendTo(connectionId, message);
      if (
        connectionId === daemonConnId &&
        message &&
        typeof message === "object" &&
        "type" in message &&
        (message as { type: string }).type === "chat.generate.dispatch"
      ) {
        dispatchCount += 1;
        const msg = message as unknown as {
          requestId: string;
          agentId?: string;
        };
        queueMicrotask(() => {
          pending.complete(msg.requestId, {
            type: "chat.generate.result",
            requestId: msg.requestId,
            ok: true,
            data: {
              text: dispatchCount === 1 ? "first" : "second",
              agentId: msg.agentId ?? "agent-abc",
            },
          });
        });
      }
      return ok;
    };

    const providers = {
      isConfigured: async () => true,
    } as never;

    const first = await chat.sendMessage({
      chatSessionId: session.id,
      userId,
      text: "turn 1",
      mode: "plan",
      provider: "cursor",
      model: "auto",
      generateReply: async (ctx) =>
        resolveProviderReply(
          {
            provider: ctx.provider,
            model: ctx.model,
            text: ctx.text,
            workspaceId: ctx.workspaceId,
            workspacePath: ctx.workspacePath,
            userId,
            sessionId: session.id,
            mode: "plan",
            agentId: ctx.cursorAgentId,
            onAgentId: (agentId) => chat.setCursorAgentId(session.id, agentId),
          },
          { hub, pending, jobs, providers },
        ),
    });

    expect(first.assistantMessage.parts).toEqual([{ type: "text", text: "first" }]);
    const [rowAfterFirst] = await db
      .select()
      .from(chatSession)
      .where(eq(chatSession.id, session.id));
    expect(rowAfterFirst?.cursorAgentId).toBe("agent-abc");

    const second = await chat.sendMessage({
      chatSessionId: session.id,
      userId,
      text: "turn 2",
      mode: "plan",
      provider: "cursor",
      model: "auto",
      generateReply: async (ctx) =>
        resolveProviderReply(
          {
            provider: ctx.provider,
            model: ctx.model,
            text: ctx.text,
            workspaceId: ctx.workspaceId,
            workspacePath: ctx.workspacePath,
            userId,
            sessionId: session.id,
            mode: "plan",
            agentId: ctx.cursorAgentId,
            onAgentId: (agentId) => chat.setCursorAgentId(session.id, agentId),
          },
          { hub, pending, jobs, providers },
        ),
    });

    expect(second.assistantMessage.parts).toEqual([{ type: "text", text: "second" }]);
    expect(dispatchCount).toBe(2);

    await db.delete(chatMessage).where(eq(chatMessage.chatSessionId, session.id));
    await db.delete(chatSession).where(eq(chatSession.id, session.id));
    await db.delete(workspace).where(eq(workspace.id, ws.id));
  });
});
