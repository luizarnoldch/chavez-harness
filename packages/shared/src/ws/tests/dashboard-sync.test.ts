import { describe, expect, test } from "bun:test";
import { dashboardSnapshotSchema } from "../../schemas/dashboard.schema.ts";
import {
  connectionStatusPushSchema,
  incomingWsMessageSchema,
  sessionDeletedPushSchema,
  sessionMessageCreatedPushSchema,
  sessionUpdateRequestSchema,
  sessionUpdatedPushSchema,
  workspaceBindRequestSchema,
  workspaceConnectionSchema,
  workspaceUpdatedPushSchema,
} from "../protocol.ts";

const WS = "11111111-1111-4111-8111-111111111111";
const SESSION = "22222222-2222-4222-8222-222222222222";
const USER = "33333333-3333-4333-8333-333333333333";
const NOW = "2026-09-30T12:00:00.000Z";

const workspace = {
  id: WS,
  path: "/tmp/ws",
  userId: USER,
  daemonDesired: "on" as const,
  daemonDesiredSource: "web" as const,
  createdAt: NOW,
  updatedAt: NOW,
  lastActiveAt: NOW,
};

const session = {
  id: SESSION,
  workspaceId: WS,
  title: null,
  mode: "build" as const,
  provider: "cursor",
  model: "auto",
  createdAt: NOW,
  updatedAt: NOW,
  lastMessageAt: null,
};

describe("user.subscribe / session.update requests", () => {
  test("user.subscribe is accepted as an incoming message", () => {
    const parsed = incomingWsMessageSchema.parse({ type: "user.subscribe", id: "r1" });
    expect(parsed.type).toBe("user.subscribe");
  });

  test("session.update accepts partial settings and nullable title", () => {
    const parsed = sessionUpdateRequestSchema.parse({
      type: "session.update",
      id: "r2",
      chatSessionId: SESSION,
      mode: "build",
      title: null,
    });
    expect(parsed.mode).toBe("build");
    expect(parsed.title).toBeNull();
    expect(incomingWsMessageSchema.parse(parsed).type).toBe("session.update");
  });

  test("session.update rejects an unknown mode", () => {
    const result = sessionUpdateRequestSchema.safeParse({
      type: "session.update",
      id: "r3",
      chatSessionId: SESSION,
      mode: "chaos",
    });
    expect(result.success).toBe(false);
  });

  test("workspace.bind carries an optional client label", () => {
    const withLabel = workspaceBindRequestSchema.parse({
      type: "workspace.bind",
      id: "b1",
      path: "/tmp/ws",
      clientKind: "client",
      clientLabel: "tui",
    });
    expect(withLabel.clientLabel).toBe("tui");
    const without = workspaceBindRequestSchema.parse({
      type: "workspace.bind",
      id: "b2",
      path: "/tmp/ws",
      clientKind: "client",
    });
    expect(without.clientLabel).toBeUndefined();
    expect(
      workspaceBindRequestSchema.safeParse({
        type: "workspace.bind",
        id: "b3",
        path: "/tmp/ws",
        clientKind: "client",
        clientLabel: "phone",
      }).success,
    ).toBe(false);
  });
});

describe("push metadata", () => {
  test("session.updated keeps the dto in data and exposes origin/change", () => {
    const parsed = sessionUpdatedPushSchema.parse({
      push: true,
      eventId: "e1",
      type: "session.updated",
      origin: "tui",
      change: "settings",
      changed: ["mode"],
      data: session,
    });
    expect(parsed.origin).toBe("tui");
    expect(parsed.changed).toEqual(["mode"]);
    expect(parsed.data.mode).toBe("build");
  });

  test("older pushes without origin still parse", () => {
    expect(
      sessionUpdatedPushSchema.safeParse({
        push: true,
        eventId: "e2",
        type: "session.updated",
        data: session,
      }).success,
    ).toBe(true);
    expect(
      sessionDeletedPushSchema.safeParse({
        push: true,
        eventId: "e3",
        type: "session.deleted",
        data: { workspaceId: WS, chatSessionId: SESSION },
      }).success,
    ).toBe(true);
  });

  test("session.message.created accepts origin", () => {
    const result = sessionMessageCreatedPushSchema.safeParse({
      push: true,
      eventId: "e4",
      type: "session.message.created",
      origin: "web",
      data: {
        workspaceId: WS,
        session,
        message: {
          id: "44444444-4444-4444-8444-444444444444",
          chatSessionId: SESSION,
          role: "user",
          mode: "plan",
          provider: "cursor",
          model: "auto",
          status: "done",
          error: null,
          parts: [{ type: "text", text: "hola" }],
          usage: null,
          clientMessageId: null,
          seq: 1,
          createdAt: NOW,
        },
      },
    });
    expect(result.success).toBe(true);
  });

  test("connection.status exposes daemonDesired and client labels", () => {
    const parsed = connectionStatusPushSchema.parse({
      push: true,
      eventId: "e5",
      type: "connection.status",
      data: {
        linked: true,
        workspaceId: WS,
        path: "/tmp/ws",
        daemon: "online",
        daemonDesired: "on",
        connections: [
          { connectionId: "c1", clientKind: "client", role: null, clientLabel: "web" },
        ],
      },
    });
    expect(parsed.data.daemonDesired).toBe("on");
    expect(parsed.data.connections[0]?.clientLabel).toBe("web");
    expect(
      workspaceConnectionSchema.safeParse({ connectionId: "c2", clientKind: "daemon" }).success,
    ).toBe(true);
  });

  test("workspace.updated carries the workspace row and connections", () => {
    const parsed = workspaceUpdatedPushSchema.parse({
      push: true,
      eventId: "e6",
      type: "workspace.updated",
      origin: "web",
      data: {
        reason: "daemon.desired",
        workspace,
        daemonStatus: "offline",
        connections: [],
      },
    });
    expect(parsed.data.workspace.daemonDesired).toBe("on");
    expect(parsed.data.reason).toBe("daemon.desired");
  });
});

describe("dashboard snapshot", () => {
  test("parses a full snapshot", () => {
    const parsed = dashboardSnapshotSchema.parse({
      machineStatus: "online",
      workspaces: [
        {
          ...workspace,
          daemonStatus: "online",
          connections: [{ connectionId: "c1", clientKind: "client", clientLabel: "tui" }],
          sessionCount: 3,
        },
      ],
      recentSessions: [{ ...session, workspacePath: "/tmp/ws" }],
      sessionsToday: 2,
      generatedAt: NOW,
    });
    expect(parsed.workspaces[0]?.sessionCount).toBe(3);
    expect(parsed.recentSessions[0]?.workspacePath).toBe("/tmp/ws");
  });

  test("rejects a negative session counter", () => {
    expect(
      dashboardSnapshotSchema.safeParse({
        machineStatus: "offline",
        workspaces: [],
        recentSessions: [],
        sessionsToday: -1,
        generatedAt: NOW,
      }).success,
    ).toBe(false);
  });
});
