import { describe, expect, test } from "bun:test";
import {
  isSessionGenerating,
  type SessionDeletedEvent,
  type WorkspaceBridgeState,
} from "../bridge.ts";
import {
  SESSION_A,
  SESSION_B,
  WS_ID,
  createFakeServer,
  makeMessage,
  makeSession,
} from "./fake-server.ts";

async function connected(
  setup: (server: ReturnType<typeof createFakeServer>) => void = () => {},
  bridgeOptions: Parameters<ReturnType<typeof createFakeServer>["newBridge"]>[0] = {},
) {
  const server = createFakeServer();
  server.addSession(makeSession(SESSION_A, { lastMessageAt: "2026-09-30T10:00:00.000Z" }), [
    makeMessage(SESSION_A, 1, "user", "hola"),
    makeMessage(SESSION_A, 2, "assistant", "qué tal"),
  ]);
  setup(server);
  const bridge = server.newBridge(bridgeOptions);
  await bridge.connect("http://localhost:3001", "token", "/tmp/ws-sync");
  return { server, bridge };
}

describe("connect + reconnect", () => {
  test("first connect binds as the TUI", async () => {
    const { server, bridge } = await connected();
    const bind = server.requests.find((r) => r.type === "workspace.bind");
    expect(bind).toMatchObject({
      clientKind: "client",
      clientLabel: "tui",
      path: "/tmp/ws-sync",
    });
    expect(bridge.getState()).toMatchObject({
      status: "synced",
      workspaceId: WS_ID,
      chatSessionId: SESSION_A,
      currentSession: { id: SESSION_A, mode: "plan", provider: "cursor", model: "auto" },
    });
  });

  test("a reconnect re-binds, syncs and catches up the open session after its last seq", async () => {
    const { server, bridge } = await connected();
    const messageEvents: string[] = [];
    bridge.onSessionMessages((id) => messageEvents.push(id));

    server.drop();
    expect(bridge.getState().status).toBe("disconnected");
    expect(bridge.getState().machineOnline).toBe(false);

    // Missed while offline.
    server.messages.get(SESSION_A)!.push(
      makeMessage(SESSION_A, 3, "user", "desde la web"),
      makeMessage(SESSION_A, 4, "assistant", "respuesta"),
    );

    const mark = server.requests.length;
    await server.open(true);

    expect(server.types(mark)).toEqual(["workspace.bind", "workspace.sync", "session.open"]);
    const [bind, sync, open] = server.requests.slice(mark);
    expect(bind).toMatchObject({
      clientKind: "client",
      clientLabel: "tui",
      path: "/tmp/ws-sync",
    });
    expect(sync).toMatchObject({ workspaceId: WS_ID, chatSessionId: SESSION_A });
    expect(open).toMatchObject({ chatSessionId: SESSION_A, afterSeq: 2, workspaceId: WS_ID });

    expect(bridge.getSession(SESSION_A)!.messages.map((m) => m.seq)).toEqual([1, 2, 3, 4]);
    expect(messageEvents).toContain(SESSION_A);
    expect(bridge.getState()).toMatchObject({ status: "synced", machineOnline: true, error: null });
  });

  test("the first socket open does not trigger a re-sync", async () => {
    const { server } = await connected();
    // connect() consumed the initial open; only a reconnect flips the flag.
    expect(server.requests.filter((r) => r.type === "workspace.bind")).toHaveLength(1);
  });

  test("a session deleted while offline is replaced after the reconnect", async () => {
    const { server, bridge } = await connected((s) => {
      s.addSession(makeSession(SESSION_B, { lastMessageAt: "2026-09-29T10:00:00.000Z" }));
    });
    server.drop();
    server.sessions.delete(SESSION_A);
    server.messages.delete(SESSION_A);

    await server.open(true);
    await Bun.sleep(0);

    expect(bridge.getSession(SESSION_A)).toBeUndefined();
    expect(bridge.getState().chatSessionId).toBe(SESSION_B);
    expect(bridge.getState().notice).toContain("eliminada");
  });

  test("cached sessions are refetched in full after a drop", async () => {
    const { server, bridge } = await connected();
    server.drop();
    const mark = server.requests.length;
    await bridge.openSession(SESSION_A);
    expect(server.requests.slice(mark)[0]).toMatchObject({
      type: "session.open",
      chatSessionId: SESSION_A,
    });
    expect(server.requests.slice(mark)[0]).not.toHaveProperty("afterSeq");
  });

  test("a fresh cached session is served without a request", async () => {
    const { server, bridge } = await connected();
    const mark = server.requests.length;
    const session = await bridge.openSession(SESSION_A);
    expect(session.messages).toHaveLength(2);
    expect(server.requests.length).toBe(mark);
  });

  test("closes of a replaced client are ignored", async () => {
    const { server, bridge } = await connected();
    await bridge.close();
    server.drop();
    expect(bridge.getState().status).toBe("disconnected");
    expect(bridge.getState().notice).toBeNull();
  });
});

describe("session.updated", () => {
  test("remote mode change updates the current settings and keeps the messages", async () => {
    const { server, bridge } = await connected();
    const ticks: WorkspaceBridgeState[] = [];
    bridge.subscribe(() => ticks.push(bridge.getState()));

    server.push({
      type: "session.updated",
      origin: "web",
      change: "settings",
      changed: ["mode"],
      data: makeSession(SESSION_A, { mode: "build", lastMessageAt: "2026-09-30T10:00:00.000Z" }),
    });

    expect(bridge.getState().currentSession).toMatchObject({ id: SESSION_A, mode: "build" });
    expect(bridge.getSession(SESSION_A)!.mode).toBe("build");
    expect(bridge.getSession(SESSION_A)!.messages).toHaveLength(2);
    expect(ticks.length).toBeGreaterThan(0);
  });

  test("model/provider changes are exposed too", async () => {
    const { server, bridge } = await connected();
    server.push({
      type: "session.updated",
      origin: "web",
      change: "settings",
      changed: ["provider", "model"],
      data: makeSession(SESSION_A, { provider: "local", model: "eco" }),
    });
    expect(bridge.getState().currentSession).toMatchObject({ provider: "local", model: "eco" });
  });

  test("an update of another session does not touch the current settings", async () => {
    const { server, bridge } = await connected();
    const before = bridge.getState().currentSession;
    server.push({
      type: "session.updated",
      change: "settings",
      data: makeSession(SESSION_B, { mode: "build" }),
    });
    expect(bridge.getState().currentSession).toEqual(before);
    expect(bridge.getSessionsList().map((s) => s.id)).toContain(SESSION_B);
  });

  test("updates for other workspaces are ignored", async () => {
    const { server, bridge } = await connected();
    server.push({
      type: "session.updated",
      change: "created",
      data: makeSession(SESSION_B, { workspaceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" }),
    });
    expect(bridge.getSessionsList().map((s) => s.id)).not.toContain(SESSION_B);
  });
});

describe("session.deleted", () => {
  test("deleting a non-current session just drops it from cache and list", async () => {
    const { server, bridge } = await connected((s) => s.addSession(makeSession(SESSION_B)));
    await bridge.listSessions();
    await bridge.openSession(SESSION_B);
    await bridge.openSession(SESSION_A);
    const mark = server.requests.length;

    server.push({
      type: "session.deleted",
      origin: "web",
      data: { workspaceId: WS_ID, chatSessionId: SESSION_B },
    });

    expect(bridge.getSession(SESSION_B)).toBeUndefined();
    expect(bridge.getSessionsList().map((s) => s.id)).toEqual([SESSION_A]);
    expect(bridge.getState().chatSessionId).toBe(SESSION_A);
    expect(server.requests.length).toBe(mark);
    expect(bridge.getState().notice).toBeNull();
  });

  test("deleting the current session opens the latest remaining one and warns", async () => {
    const { server, bridge } = await connected((s) =>
      s.addSession(makeSession(SESSION_B, { lastMessageAt: "2026-09-28T10:00:00.000Z" })),
    );
    const events: SessionDeletedEvent[] = [];
    bridge.onSessionDeleted((e) => events.push(e));

    server.sessions.delete(SESSION_A);
    server.push({
      type: "session.deleted",
      origin: "web",
      data: { workspaceId: WS_ID, chatSessionId: SESSION_A },
    });
    await Bun.sleep(0);
    await Bun.sleep(0);

    expect(bridge.getSession(SESSION_A)).toBeUndefined();
    expect(bridge.getState().chatSessionId).toBe(SESSION_B);
    expect(bridge.getState().currentSession?.id).toBe(SESSION_B);
    expect(bridge.getState().notice).toContain("la web");
    expect(bridge.getState().notice).toContain(SESSION_A.slice(0, 8));
    expect(events).toEqual([{ deletedId: SESSION_A, nextId: SESSION_B, origin: "web", local: false }]);
  });

  test("deleting the only session creates a new one", async () => {
    const { server, bridge } = await connected();
    const events: SessionDeletedEvent[] = [];
    bridge.onSessionDeleted((e) => events.push(e));

    server.sessions.delete(SESSION_A);
    server.push({
      type: "session.deleted",
      origin: "tui",
      data: { workspaceId: WS_ID, chatSessionId: SESSION_A },
    });
    await Bun.sleep(0);
    await Bun.sleep(0);

    const next = bridge.getState().chatSessionId;
    expect(next).not.toBeNull();
    expect(next).not.toBe(SESSION_A);
    expect(events[0]?.nextId).toBe(next);
    expect(bridge.getState().notice).toContain("otro TUI");
  });

  test("the echo of our own delete does not open a replacement", async () => {
    const { server, bridge } = await connected((s) => s.addSession(makeSession(SESSION_B)));
    await bridge.openSession(SESSION_A);
    // The server broadcasts the push before the reply reaches the sender.
    server.beforeReply["session.delete"] = (req) =>
      server.push({
        type: "session.deleted",
        origin: "tui",
        data: { workspaceId: WS_ID, chatSessionId: req.chatSessionId },
      });
    const events: unknown[] = [];
    bridge.onSessionDeleted((e) => events.push(e));
    const mark = server.requests.length;

    await bridge.deleteSession(SESSION_A);
    await Bun.sleep(0);

    expect(server.types(mark)).toEqual(["session.delete"]);
    expect(bridge.getState().chatSessionId).toBeNull();
    expect(bridge.getState().notice).toBeNull();
    expect(events).toEqual([]);
  });
});

describe("session.message.created", () => {
  test("is applied straight from the push, no refetch", async () => {
    const { server, bridge } = await connected();
    const seen: string[] = [];
    bridge.onSessionMessages((id) => seen.push(id));
    const mark = server.requests.length;

    const message = makeMessage(SESSION_A, 3, "user", "desde la web");
    server.push({
      type: "session.message.created",
      origin: "web",
      data: {
        workspaceId: WS_ID,
        session: makeSession(SESSION_A, { title: "desde la web", mode: "build" }),
        message,
      },
    });

    expect(bridge.getSession(SESSION_A)!.messages.map((m) => m.id)).toContain(message.id);
    expect(bridge.getSession(SESSION_A)!.title).toBe("desde la web");
    expect(bridge.getState().currentSession?.mode).toBe("build");
    expect(seen).toEqual([SESSION_A]);
    expect(server.requests.length).toBe(mark);

    // Duplicates are ignored.
    server.push({
      type: "session.message.created",
      data: { workspaceId: WS_ID, session: makeSession(SESSION_A), message },
    });
    expect(bridge.getSession(SESSION_A)!.messages).toHaveLength(3);
    expect(seen).toEqual([SESSION_A]);
  });

  test("a gap in seq pulls the missing tail", async () => {
    const { server, bridge } = await connected();
    server.messages.get(SESSION_A)!.push(
      makeMessage(SESSION_A, 3, "user", "perdido"),
      makeMessage(SESSION_A, 4, "assistant", "perdido 2"),
    );
    const late = makeMessage(SESSION_A, 5, "user", "llega");
    server.messages.get(SESSION_A)!.push(late);
    const mark = server.requests.length;

    server.push({
      type: "session.message.created",
      data: { workspaceId: WS_ID, session: makeSession(SESSION_A), message: late },
    });
    await Bun.sleep(0);
    await Bun.sleep(0);

    expect(server.requests.slice(mark)[0]).toMatchObject({
      type: "session.open",
      chatSessionId: SESSION_A,
      afterSeq: 2,
    });
    expect(bridge.getSession(SESSION_A)!.messages.map((m) => m.seq)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("remote generation", () => {
  const progress = (sessionId: string) => ({
    type: "chat.generate.progress",
    data: { requestId: "r1", workspaceId: WS_ID, sessionId, phase: "streaming", textDelta: "ho" },
  });

  test("a stream started by the web marks the current session as generating", async () => {
    const { server, bridge } = await connected();
    expect(isSessionGenerating(bridge.getState(), SESSION_A)).toBe(false);

    server.push(progress(SESSION_A));
    expect(isSessionGenerating(bridge.getState(), SESSION_A)).toBe(true);
    expect(isSessionGenerating(bridge.getState(), SESSION_B)).toBe(false);
    expect(isSessionGenerating(bridge.getState(), undefined)).toBe(false);
    expect(bridge.getState().generateStream?.draftText).toBe("ho");
  });

  test("the assistant message clears it and is applied from the cache", async () => {
    const { server, bridge } = await connected();
    server.push(progress(SESSION_A));
    const mark = server.requests.length;

    server.push({
      type: "session.message.created",
      origin: "web",
      data: {
        workspaceId: WS_ID,
        session: makeSession(SESSION_A),
        message: makeMessage(SESSION_A, 3, "assistant", "listo"),
      },
    });

    expect(bridge.getState().generateStream).toBeNull();
    expect(isSessionGenerating(bridge.getState(), SESSION_A)).toBe(false);
    expect(bridge.getSession(SESSION_A)!.messages).toHaveLength(3);
    expect(server.requests.length).toBe(mark);
  });

  test("session.updated with change=message also clears it", async () => {
    const { server, bridge } = await connected();
    server.push(progress(SESSION_A));
    server.push({ type: "session.updated", change: "message", data: makeSession(SESSION_A) });
    expect(bridge.getState().generateStream).toBeNull();
  });

  test("deleting the generating session clears it", async () => {
    const { server, bridge } = await connected((s) => s.addSession(makeSession(SESSION_B)));
    await bridge.openSession(SESSION_B);
    server.push(progress(SESSION_B));
    server.push({
      type: "session.deleted",
      data: { workspaceId: WS_ID, chatSessionId: SESSION_B },
    });
    await Bun.sleep(0);
    await Bun.sleep(0);
    expect(bridge.getState().generateStream).toBeNull();
  });

  test("a silent stream is dropped so the prompt never stays blocked", async () => {
    const { server, bridge } = await connected(undefined, { streamStaleMs: 20 });
    server.push(progress(SESSION_A));
    expect(isSessionGenerating(bridge.getState(), SESSION_A)).toBe(true);
    await Bun.sleep(60);
    expect(isSessionGenerating(bridge.getState(), SESSION_A)).toBe(false);
  });

  test("a dropped socket clears the stream", async () => {
    const { server, bridge } = await connected();
    server.push(progress(SESSION_A));
    server.drop();
    expect(bridge.getState().generateStream).toBeNull();
  });

  test("local sends still work and clear the stream", async () => {
    const { server, bridge } = await connected();
    // Progress for our own send arrives before the reply, like on the real server.
    server.beforeReply["chat.send"] = () => server.push(progress(SESSION_A));

    const reply = await bridge.sendMessage({
      chatSessionId: SESSION_A,
      text: "hola",
      mode: "build",
    });

    expect(reply.ok).toBe(true);
    expect(bridge.getState().generateStream).toBeNull();
    expect(bridge.getSession(SESSION_A)!.messages.map((m) => m.seq)).toEqual([1, 2, 3, 4]);
    expect(bridge.getState().currentSession?.mode).toBe("build");
    expect(bridge.getSessionsList()[0]?.id).toBe(SESSION_A);
  });
});

describe("updateSession", () => {
  test("sends session.update and applies the reply", async () => {
    const { server, bridge } = await connected();
    const mark = server.requests.length;

    const updated = await bridge.updateSession(SESSION_A, { mode: "build" });

    expect(server.requests.slice(mark)[0]).toMatchObject({
      type: "session.update",
      chatSessionId: SESSION_A,
      mode: "build",
    });
    expect(updated.mode).toBe("build");
    expect(bridge.getState().currentSession?.mode).toBe("build");
    expect(bridge.getSession(SESSION_A)!.messages).toHaveLength(2);
    expect(bridge.getSessionsList().find((s) => s.id === SESSION_A)?.mode).toBe("build");
  });

  test("provider and model travel together", async () => {
    const { server, bridge } = await connected();
    await bridge.updateSession(SESSION_A, { provider: "local", model: "eco" });
    const req = server.requests.at(-1)!;
    expect(req).toMatchObject({ type: "session.update", provider: "local", model: "eco" });
    expect(req).not.toHaveProperty("mode");
    expect(bridge.getState().currentSession).toMatchObject({ provider: "local", model: "eco" });
  });

  test("rejects with the server error and leaves the state alone", async () => {
    const { bridge } = await connected();
    const before = bridge.getState().currentSession;
    await expect(
      bridge.updateSession("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", { mode: "build" }),
    ).rejects.toThrow("Sesión no encontrada");
    expect(bridge.getState().currentSession).toEqual(before);
  });

  test("fails without a connection", async () => {
    const bridge = createFakeServer().newBridge();
    await expect(bridge.updateSession(SESSION_A, { mode: "build" })).rejects.toThrow(
      "Workspace no conectado",
    );
  });
});

describe("live sessions list", () => {
  async function withList() {
    const ctx = await connected((s) => {
      s.addSession(makeSession(SESSION_B, { lastMessageAt: "2026-09-20T10:00:00.000Z" }));
    });
    await ctx.bridge.listSessions();
    return ctx;
  }

  test("listSessions fills the list newest first", async () => {
    const { bridge } = await withList();
    expect(bridge.getSessionsList().map((s) => s.id)).toEqual([SESSION_A, SESSION_B]);
  });

  test("a session created elsewhere shows up on top and notifies subscribers", async () => {
    const { server, bridge } = await withList();
    let notified = 0;
    bridge.subscribeSessions(() => notified++);
    const created = "ffffffff-ffff-4fff-8fff-ffffffffffff";

    server.push({
      type: "session.updated",
      origin: "web",
      change: "created",
      data: makeSession(created, { title: "nueva desde la web" }),
    });

    expect(bridge.getSessionsList().map((s) => s.id)).toEqual([created, SESSION_A, SESSION_B]);
    expect(notified).toBe(1);
  });

  test("a message bumps its session to the top of the list", async () => {
    const { server, bridge } = await withList();
    server.push({
      type: "session.updated",
      change: "message",
      data: makeSession(SESSION_B, { lastMessageAt: "2026-09-30T12:00:00.000Z" }),
    });
    expect(bridge.getSessionsList().map((s) => s.id)).toEqual([SESSION_B, SESSION_A]);
  });

  test("a delete removes the row and notifies subscribers", async () => {
    const { server, bridge } = await withList();
    let notified = 0;
    const unsubscribe = bridge.subscribeSessions(() => notified++);
    server.push({
      type: "session.deleted",
      origin: "web",
      data: { workspaceId: WS_ID, chatSessionId: SESSION_B },
    });
    expect(bridge.getSessionsList().map((s) => s.id)).toEqual([SESSION_A]);
    expect(notified).toBe(1);

    unsubscribe();
    server.push({
      type: "session.updated",
      change: "settings",
      data: makeSession(SESSION_A, { mode: "build" }),
    });
    expect(notified).toBe(1);
  });

  test("updateSession keeps the list in sync", async () => {
    const { bridge } = await withList();
    await bridge.updateSession(SESSION_B, { title: "renombrada" });
    expect(bridge.getSessionsList().find((s) => s.id === SESSION_B)?.title).toBe("renombrada");
  });
});

describe("notice", () => {
  test("expires on its own and can be cleared", async () => {
    const { server, bridge } = await connected(undefined, { noticeMs: 20 });
    server.sessions.delete(SESSION_A);
    server.push({
      type: "session.deleted",
      origin: "web",
      data: { workspaceId: WS_ID, chatSessionId: SESSION_A },
    });
    await Bun.sleep(0);
    await Bun.sleep(0);
    expect(bridge.getState().notice).not.toBeNull();
    await Bun.sleep(60);
    expect(bridge.getState().notice).toBeNull();
  });
});
