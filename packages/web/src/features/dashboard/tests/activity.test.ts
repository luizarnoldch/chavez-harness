import { describe, expect, test } from "bun:test";
import type {
  ChatMessageDto,
  ChatSessionDto,
  DashboardSnapshot,
  DashboardWorkspace,
} from "@chavez-harness/shared";
import {
  ACTIVITY_LIMIT,
  GENERATING_TTL_MS,
  clientCounts,
  describeActivity,
  generatingCountFor,
  generatingList,
  initialActivityState,
  liveWorkspaces,
  reduceActivity,
  type ActivityEvent,
  type UserActivityState,
} from "../activity";

const WS = "11111111-1111-4111-8111-111111111111";
const WS2 = "55555555-5555-4555-8555-555555555555";
const S1 = "22222222-2222-4222-8222-222222222222";
const USER = "33333333-3333-4333-8333-333333333333";
const T0 = Date.parse("2026-09-30T12:00:00.000Z");
const DAY = Date.parse("2026-09-30T00:00:00.000Z");
const ISO_NOW = new Date(T0).toISOString();
const ISO_YESTERDAY = "2026-09-29T09:00:00.000Z";

function workspace(overrides: Partial<DashboardWorkspace> = {}): DashboardWorkspace {
  return {
    id: WS,
    path: "/home/me/proj",
    userId: USER,
    daemonDesired: "off",
    daemonDesiredSource: null,
    createdAt: ISO_YESTERDAY,
    updatedAt: ISO_YESTERDAY,
    lastActiveAt: ISO_YESTERDAY,
    daemonStatus: "offline",
    connections: [],
    sessionCount: 2,
    ...overrides,
  };
}

function session(overrides: Partial<ChatSessionDto> = {}): ChatSessionDto {
  return {
    id: S1,
    workspaceId: WS,
    title: "Mi sesión",
    mode: "plan",
    provider: "cursor",
    model: "auto",
    createdAt: ISO_YESTERDAY,
    updatedAt: ISO_YESTERDAY,
    lastMessageAt: ISO_YESTERDAY,
    ...overrides,
  };
}

function message(overrides: Partial<ChatMessageDto> = {}): ChatMessageDto {
  return {
    id: crypto.randomUUID(),
    chatSessionId: S1,
    role: "user",
    mode: "plan",
    provider: "cursor",
    model: "auto",
    status: "done",
    error: null,
    parts: [{ type: "text", text: "hola mundo" }],
    usage: null,
    clientMessageId: null,
    seq: 1,
    createdAt: ISO_NOW,
    ...overrides,
  };
}

let eventCounter = 0;
function push(type: string, data: unknown, extra: Record<string, unknown> = {}): ActivityEvent {
  eventCounter += 1;
  return {
    type: "push",
    now: T0,
    message: { push: true, eventId: `evt-${eventCounter}`, type, data, ...extra },
  };
}

function loaded(workspaces: DashboardWorkspace[] = [workspace()], extra: Partial<DashboardSnapshot> = {}) {
  const snapshot: DashboardSnapshot = {
    machineStatus: "online",
    workspaces,
    recentSessions: [{ ...session(), workspacePath: "/home/me/proj" }],
    sessionsToday: 1,
    generatedAt: ISO_NOW,
    ...extra,
  };
  return reduceActivity(initialActivityState(DAY), { type: "snapshot", snapshot, todayStart: DAY });
}

function run(state: UserActivityState, ...events: ActivityEvent[]): UserActivityState {
  return events.reduce(reduceActivity, state);
}

describe("snapshot", () => {
  test("loads workspaces by id, sessions and counters", () => {
    const state = loaded([workspace(), workspace({ id: WS2, path: "/b" })]);
    expect(state.loaded).toBe(true);
    expect(state.machineStatus).toBe("online");
    expect(Object.keys(state.workspaces).sort()).toEqual([WS, WS2].sort());
    expect(state.recentSessions.map((s) => s.id)).toEqual([S1]);
    expect(state.sessionsToday).toBe(1);
  });

  test("a refresh keeps the feed and in-flight generations", () => {
    let state = loaded();
    state = run(state, push("machine.presence", { machineId: "m", status: "offline" }));
    state = run(
      state,
      push("chat.generate.progress", {
        requestId: "r",
        workspaceId: WS,
        sessionId: S1,
        phase: "streaming",
      }),
    );
    const refreshed = reduceActivity(state, {
      type: "snapshot",
      snapshot: {
        machineStatus: "offline",
        workspaces: [workspace({ sessionCount: 9 })],
        recentSessions: [],
        sessionsToday: 4,
        generatedAt: ISO_NOW,
      },
      todayStart: DAY,
    });
    expect(refreshed.activity).toHaveLength(1);
    expect(Object.keys(refreshed.generating)).toEqual([S1]);
    expect(refreshed.workspaces[WS]?.sessionCount).toBe(9);
    expect(refreshed.sessionsToday).toBe(4);
  });
});

describe("machine and workspace pushes", () => {
  test("machine.presence logs only real changes", () => {
    let state = loaded();
    state = run(state, push("machine.presence", { machineId: "m", status: "online" }));
    expect(state.activity).toHaveLength(0);
    state = run(state, push("machine.presence", { machineId: "m", status: "offline" }));
    expect(state.machineStatus).toBe("offline");
    expect(state.activity[0]).toMatchObject({ kind: "machine", detail: "offline" });
  });

  test("workspace.updated adds an unknown workspace with zero sessions", () => {
    const state = run(
      loaded([]),
      push(
        "workspace.updated",
        {
          reason: "bind",
          workspace: workspace({ id: WS2, path: "/nuevo" }),
          daemonStatus: "offline",
          connections: [],
        },
        { origin: "tui" },
      ),
    );
    expect(state.workspaces[WS2]).toMatchObject({ path: "/nuevo", sessionCount: 0 });
    expect(state.activity[0]).toMatchObject({ kind: "workspace", origin: "tui", workspaceId: WS2 });
  });

  test("workspace.updated keeps the session count of a known workspace", () => {
    const state = run(
      loaded(),
      push(
        "workspace.updated",
        {
          reason: "daemon.desired",
          workspace: workspace({ daemonDesired: "on" }),
          daemonStatus: "offline",
          connections: [],
        },
        { origin: "web" },
      ),
    );
    expect(state.workspaces[WS]).toMatchObject({ sessionCount: 2, daemonDesired: "on" });
    expect(state.activity).toHaveLength(0);
  });

  test("the daemon flip after a desired change is attributed to its origin, once", () => {
    let state = loaded();
    state = run(
      state,
      push(
        "workspace.updated",
        {
          reason: "daemon.desired",
          workspace: workspace({ daemonDesired: "on" }),
          daemonStatus: "offline",
          connections: [],
        },
        { origin: "web" },
      ),
      push("daemon.presence", { workspaceId: WS, status: "online", role: "primary" }),
      push("connection.status", {
        linked: true,
        workspaceId: WS,
        path: "/home/me/proj",
        daemon: "online",
        daemonDesired: "on",
        connections: [{ connectionId: "d", clientKind: "daemon", role: "primary" }],
      }),
    );
    expect(state.workspaces[WS]).toMatchObject({ daemonStatus: "online", daemonDesired: "on" });
    expect(state.activity).toHaveLength(1);
    expect(state.activity[0]).toMatchObject({ kind: "daemon", detail: "online", origin: "web" });
  });

  test("a daemon flip long after the desired change has no origin", () => {
    let state = loaded();
    state = run(
      state,
      push(
        "workspace.updated",
        {
          reason: "daemon.desired",
          workspace: workspace({ daemonDesired: "on" }),
          daemonStatus: "offline",
          connections: [],
        },
        { origin: "web" },
      ),
    );
    state = reduceActivity(state, {
      type: "push",
      now: T0 + 60_000,
      message: {
        push: true,
        eventId: "late",
        type: "daemon.presence",
        data: { workspaceId: WS, status: "stale" },
      },
    });
    expect(state.activity[0]).toMatchObject({ detail: "stale", origin: null });
  });

  test("connection.status for an unknown workspace is ignored", () => {
    const state = run(
      loaded([]),
      push("connection.status", {
        linked: true,
        workspaceId: WS2,
        path: "/x",
        daemon: "online",
        connections: [],
      }),
    );
    expect(state.workspaces).toEqual({});
  });
});

describe("session pushes", () => {
  test("created bumps counters, shows up first and is logged", () => {
    const created = session({
      id: "66666666-6666-4666-8666-666666666666",
      title: null,
      createdAt: ISO_NOW,
      updatedAt: ISO_NOW,
      lastMessageAt: null,
    });
    const state = run(loaded(), push("session.updated", created, { origin: "web", change: "created" }));
    expect(state.workspaces[WS]?.sessionCount).toBe(3);
    expect(state.sessionsToday).toBe(2);
    expect(state.recentSessions[0]).toMatchObject({ id: created.id, workspacePath: "/home/me/proj" });
    expect(state.activity[0]).toMatchObject({ kind: "session.created", origin: "web", sessionId: created.id });
  });

  test("a session created before today does not count as today", () => {
    const state = run(
      loaded(),
      push("session.updated", session({ id: "77777777-7777-4777-8777-777777777777" }), {
        change: "created",
      }),
    );
    expect(state.sessionsToday).toBe(1);
  });

  test("settings changes log mode and model separately", () => {
    const updated = session({ mode: "build", model: "gpt-x" });
    const state = run(
      loaded(),
      push("session.updated", updated, {
        origin: "tui",
        change: "settings",
        changed: ["mode", "model"],
      }),
    );
    expect(state.recentSessions[0]).toMatchObject({ mode: "build", model: "gpt-x" });
    expect(state.activity.map((a) => a.kind).sort()).toEqual(["session.mode", "session.model"]);
    expect(state.activity.find((a) => a.kind === "session.mode")).toMatchObject({
      detail: "build",
      origin: "tui",
    });
  });

  test("a title-only change is silent", () => {
    const state = run(
      loaded(),
      push("session.updated", session({ title: "Otro" }), { change: "settings", changed: ["title"] }),
    );
    expect(state.activity).toHaveLength(0);
    expect(state.recentSessions[0]?.title).toBe("Otro");
  });

  test("a message-change update ends the generation and counts the session for today once", () => {
    let state = loaded();
    state = run(
      state,
      push("chat.generate.progress", {
        requestId: "r",
        workspaceId: WS,
        sessionId: S1,
        phase: "tool",
      }),
    );
    expect(Object.keys(state.generating)).toEqual([S1]);

    state = run(
      state,
      push("session.updated", session({ lastMessageAt: ISO_NOW }), { change: "message" }),
    );
    expect(state.generating).toEqual({});
    expect(state.sessionsToday).toBe(2);

    state = run(
      state,
      push("session.updated", session({ lastMessageAt: ISO_NOW }), { change: "message" }),
    );
    expect(state.sessionsToday).toBe(2);
  });

  test("deleted removes the session, lowers the count and logs its title", () => {
    let state = loaded();
    state = run(
      state,
      push("chat.generate.progress", {
        requestId: "r",
        workspaceId: WS,
        sessionId: S1,
        phase: "streaming",
      }),
      push("session.deleted", { workspaceId: WS, chatSessionId: S1 }, { origin: "web" }),
    );
    expect(state.recentSessions).toEqual([]);
    expect(state.workspaces[WS]?.sessionCount).toBe(1);
    expect(state.generating).toEqual({});
    expect(state.activity[0]).toMatchObject({
      kind: "session.deleted",
      origin: "web",
      text: "Mi sesión",
    });
  });
});

describe("messages and generation", () => {
  test("a user message starts a generation and is logged with a snippet", () => {
    const state = run(
      loaded(),
      push(
        "session.message.created",
        { workspaceId: WS, session: session({ lastMessageAt: ISO_NOW }), message: message() },
        { origin: "tui" },
      ),
    );
    expect(state.generating[S1]).toMatchObject({ phase: "waiting", workspaceId: WS });
    expect(state.activity[0]).toMatchObject({
      kind: "message",
      detail: "user",
      text: "hola mundo",
      origin: "tui",
    });
    expect(state.sessionsToday).toBe(2);
  });

  test("long snippets are truncated", () => {
    const long = "palabra ".repeat(40);
    const state = run(
      loaded(),
      push("session.message.created", {
        workspaceId: WS,
        session: session(),
        message: message({ parts: [{ type: "text", text: long }] }),
      }),
    );
    const text = state.activity[0]?.text ?? "";
    expect(text.length).toBeLessThanOrEqual(90);
    expect(text.endsWith("…")).toBe(true);
  });

  test("the assistant message ends the generation; errors are flagged", () => {
    let state = loaded();
    state = run(
      state,
      push("session.message.created", { workspaceId: WS, session: session(), message: message() }),
      push("session.message.created", {
        workspaceId: WS,
        session: session(),
        message: message({
          id: crypto.randomUUID(),
          role: "assistant",
          status: "error",
          error: "Sin daemon",
          parts: [],
          seq: 2,
        }),
      }),
    );
    expect(state.generating).toEqual({});
    expect(state.activity[0]).toMatchObject({ detail: "assistant-error", text: "Sin daemon" });
  });

  test("progress tracks phase, running tool and keeps the start time", () => {
    let state = loaded();
    state = run(
      state,
      push("chat.generate.progress", {
        requestId: "r",
        workspaceId: WS,
        sessionId: S1,
        phase: "reasoning",
      }),
    );
    const startedAt = state.generating[S1]!.startedAt;
    state = reduceActivity(state, {
      type: "push",
      now: T0 + 5_000,
      message: {
        push: true,
        eventId: "p2",
        type: "chat.generate.progress",
        data: {
          requestId: "r",
          workspaceId: WS,
          sessionId: S1,
          phase: "tool",
          toolCall: { id: "t1", name: "read_file", status: "running" },
        },
      },
    });
    expect(state.generating[S1]).toMatchObject({
      phase: "tool",
      toolName: "read_file",
      startedAt,
      updatedAt: T0 + 5_000,
    });
    expect(generatingList(state)).toHaveLength(1);
    expect(generatingCountFor(state, WS)).toBe(1);
    expect(generatingCountFor(state, WS2)).toBe(0);

    state = run(
      state,
      push("chat.generate.progress", {
        requestId: "r",
        workspaceId: WS,
        sessionId: S1,
        phase: "streaming",
        textDelta: "x",
      }),
    );
    expect(state.generating[S1]?.toolName).toBeNull();
  });

  test("idle and prune drop generations", () => {
    let state = loaded();
    state = run(
      state,
      push("chat.generate.progress", {
        requestId: "r",
        workspaceId: WS,
        sessionId: S1,
        phase: "streaming",
      }),
    );
    expect(reduceActivity(state, { type: "idle", sessionId: S1 }).generating).toEqual({});
    expect(reduceActivity(state, { type: "idle", sessionId: "otra" })).toBe(state);
    expect(reduceActivity(state, { type: "prune", now: T0 + GENERATING_TTL_MS - 1 })).toBe(state);
    expect(reduceActivity(state, { type: "prune", now: T0 + GENERATING_TTL_MS + 1 }).generating).toEqual({});
  });
});

describe("robustness", () => {
  test("unknown or malformed pushes leave the state untouched", () => {
    const state = loaded();
    expect(run(state, push("something.else", {}))).toBe(state);
    expect(run(state, push("session.updated", { nope: true }))).toBe(state);
    expect(run(state, push("daemon.presence", { workspaceId: "no-uuid", status: "online" }))).toBe(state);
  });

  test("the feed is a newest-first ring buffer", () => {
    let state = loaded();
    for (let i = 0; i < ACTIVITY_LIMIT + 10; i++) {
      state = run(
        state,
        push("session.deleted", { workspaceId: WS, chatSessionId: crypto.randomUUID() }),
      );
    }
    expect(state.activity).toHaveLength(ACTIVITY_LIMIT);
    expect(state.workspaces[WS]?.sessionCount).toBe(0);
  });

  test("recent sessions stay sorted and capped at ten", () => {
    let state = loaded();
    for (let i = 0; i < 12; i++) {
      state = run(
        state,
        push(
          "session.updated",
          session({
            id: crypto.randomUUID(),
            createdAt: ISO_YESTERDAY,
            lastMessageAt: new Date(T0 - i * 60_000).toISOString(),
          }),
          { change: "message" },
        ),
      );
    }
    expect(state.recentSessions).toHaveLength(10);
    const times = state.recentSessions.map((s) => Date.parse(s.lastMessageAt!));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
});

describe("selectors and copy", () => {
  test("liveWorkspaces keeps online daemons, newest activity first", () => {
    const state = loaded([
      workspace({ id: WS, daemonStatus: "online", lastActiveAt: "2026-09-30T10:00:00.000Z" }),
      workspace({ id: WS2, path: "/b", daemonStatus: "online", lastActiveAt: "2026-09-30T11:00:00.000Z" }),
      workspace({ id: "88888888-8888-4888-8888-888888888888", path: "/c", daemonStatus: "offline" }),
    ]);
    expect(liveWorkspaces(state).map((w) => w.id)).toEqual([WS2, WS]);
  });

  test("clientCounts separates TUI and web clients from daemons", () => {
    expect(
      clientCounts(
        workspace({
          connections: [
            { connectionId: "1", clientKind: "client", clientLabel: "tui" },
            { connectionId: "2", clientKind: "client", clientLabel: "web" },
            { connectionId: "3", clientKind: "client", clientLabel: "web" },
            { connectionId: "4", clientKind: "client", clientLabel: null },
            { connectionId: "5", clientKind: "daemon", role: "primary" },
          ],
        }),
      ),
    ).toEqual({ tui: 1, web: 2 });
  });

  test("describeActivity writes Spanish copy", () => {
    const base = {
      id: "e",
      at: T0,
      origin: null,
      workspaceId: WS,
      sessionId: null,
      text: null,
    } as const;
    expect(describeActivity({ ...base, kind: "message", detail: "user" }, "proj")).toBe(
      "Mensaje enviado · proj",
    );
    expect(describeActivity({ ...base, kind: "message", detail: "assistant" }, null)).toBe(
      "Respuesta del agente",
    );
    expect(describeActivity({ ...base, kind: "session.mode", detail: "build" }, "proj")).toBe(
      "Modo Build · proj",
    );
    expect(describeActivity({ ...base, kind: "daemon", detail: "offline" }, "proj")).toBe(
      "Daemon apagado · proj",
    );
    expect(describeActivity({ ...base, kind: "machine", detail: "online" }, null)).toBe("PC online");
  });
});
