import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { dashboardSnapshotSchema } from "@chavez-harness/shared";
import { eq } from "drizzle-orm";
import { user } from "../src/db/auth/auth-schema.ts";
import db from "../src/lib/db.ts";
import { auth } from "../src/lib/auth/index.ts";
import { createApp } from "../src/app.ts";
import { createChatService, createWorkspaceService } from "../src/services/chat.ts";
import { createHub } from "../src/ws/hub.ts";

const EMAIL = `api-dash-${Date.now()}@test.local`;
const PASSWORD = "TestPassword123!";

type Pushed = Record<string, any>;

describe("REST dashboard + session update", () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const signUp = await auth.api.signUpEmail({
      body: { email: EMAIL, password: PASSWORD, name: "API Dash" },
    });
    userId = signUp.user.id;
    const signIn = await auth.api.signInEmail({ body: { email: EMAIL, password: PASSWORD } });
    token = signIn.token!;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, userId));
  });

  function boot() {
    const hub = createHub();
    const observed: Pushed[] = [];
    hub.register({
      connectionId: "observer",
      userId,
      socket: { send: (raw) => observed.push(JSON.parse(raw)), close: () => {} },
      clientKind: null,
      clientLabel: null,
      observeUser: true,
      workspaceId: null,
      workspacePath: null,
      daemonId: null,
      role: null,
      machineId: null,
      hostname: null,
      lastHeartbeatAt: Date.now(),
    });
    const app = createApp({ ws: { resolveUserId: async () => userId, hub } });
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const call = async (path: string, init: RequestInit = {}, extra: Record<string, string> = {}) =>
      app.request(path, { ...init, headers: { ...headers, ...extra } });
    const pushes = (type: string) => observed.filter((m) => m.type === type);
    return { app, call, observed, pushes };
  }

  async function bindWorkspace(call: ReturnType<typeof boot>["call"], label: string) {
    const bind = await call("/api/workspaces/bind", {
      method: "POST",
      body: JSON.stringify({ path: `/tmp/${label}-${Date.now()}-${Math.random()}` }),
    });
    return (await bind.json()) as { id: string; path: string };
  }

  test("GET /api/dashboard returns a snapshot with counters and recent sessions", async () => {
    const { call } = boot();
    const ws = await bindWorkspace(call, "dash");
    const create = await call(`/api/workspaces/${ws.id}/sessions`, {
      method: "POST",
      body: JSON.stringify({ provider: "local", model: "eco" }),
    });
    const session = (await create.json()) as { id: string };
    await call(`/api/sessions/${session.id}/messages`, {
      method: "POST",
      body: JSON.stringify({ text: "hola dashboard", mode: "plan", provider: "local", model: "eco" }),
    });

    const res = await call("/api/dashboard");
    expect(res.status).toBe(200);
    const snapshot = dashboardSnapshotSchema.parse(await res.json());
    expect(snapshot.machineStatus).toBe("offline");
    const entry = snapshot.workspaces.find((w) => w.id === ws.id);
    expect(entry).toMatchObject({
      daemonStatus: "offline",
      daemonDesired: "off",
      sessionCount: 1,
      connections: [],
    });
    expect(snapshot.recentSessions[0]).toMatchObject({
      id: session.id,
      workspacePath: ws.path,
      title: "hola dashboard",
    });
    expect(snapshot.recentSessions.length).toBeLessThanOrEqual(10);
    expect(snapshot.sessionsToday).toBeGreaterThanOrEqual(1);
  });

  test("`since` in the future yields no sessions today; invalid `since` is a 400", async () => {
    const { call } = boot();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const res = await call(`/api/dashboard?since=${encodeURIComponent(future)}`);
    expect(dashboardSnapshotSchema.parse(await res.json()).sessionsToday).toBe(0);
    expect((await call("/api/dashboard?since=ayer")).status).toBe(400);
  });

  test("PATCH /api/sessions/:id persists settings and pushes session.updated with the header origin", async () => {
    const { call, pushes } = boot();
    const ws = await bindWorkspace(call, "patch");
    const created = await call(`/api/workspaces/${ws.id}/sessions`, {
      method: "POST",
      body: JSON.stringify({ provider: "local", model: "eco" }),
    });
    const session = (await created.json()) as { id: string; mode: string };
    expect(session.mode).toBe("plan");

    const patch = await call(
      `/api/sessions/${session.id}`,
      { method: "PATCH", body: JSON.stringify({ mode: "build", model: "pro" }) },
      { "x-chavez-client": "web" },
    );
    expect(patch.status).toBe(200);
    const body = (await patch.json()) as { session: { mode: string; model: string }; changed: string[] };
    expect(body.changed).toEqual(["mode", "model"]);
    expect(body.session).toMatchObject({ mode: "build", model: "pro" });

    const updated = pushes("session.updated").filter((m) => m.change === "settings");
    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({ origin: "web", changed: ["mode", "model"] });

    const noop = await call(`/api/sessions/${session.id}`, {
      method: "PATCH",
      body: JSON.stringify({ mode: "build" }),
    });
    expect(((await noop.json()) as { changed: string[] }).changed).toEqual([]);
    expect(pushes("session.updated").filter((m) => m.change === "settings")).toHaveLength(1);

    const stored = await call(`/api/sessions/${session.id}`);
    expect(await stored.json()).toMatchObject({ mode: "build", model: "pro" });
  });

  test("PATCH validates the body and 404s on unknown sessions", async () => {
    const { call } = boot();
    const bad = await call(`/api/sessions/${crypto.randomUUID()}`, {
      method: "PATCH",
      body: JSON.stringify({ mode: "chaos" }),
    });
    expect(bad.status).toBe(400);
    const missing = await call(`/api/sessions/${crypto.randomUUID()}`, {
      method: "PATCH",
      body: JSON.stringify({ mode: "build" }),
    });
    expect(missing.status).toBe(404);
  });

  test("REST send emits one session.updated per send and the user push has the fresh session", async () => {
    const { call, pushes } = boot();
    const ws = await bindWorkspace(call, "rest-send");
    const created = await call(`/api/workspaces/${ws.id}/sessions`, {
      method: "POST",
      body: JSON.stringify({ provider: "local", model: "eco" }),
    });
    const session = (await created.json()) as { id: string };

    const before = pushes("session.updated").length;
    const res = await call(
      `/api/sessions/${session.id}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ text: "uno", mode: "build", provider: "local", model: "eco" }),
      },
      { "x-chavez-client": "tui" },
    );
    expect(res.status).toBe(200);

    expect(pushes("session.updated").length - before).toBe(1);
    const messages = pushes("session.message.created");
    expect(messages.map((m) => m.data.message.role)).toEqual(["user", "assistant"]);
    expect(messages[0]?.data.session).toMatchObject({ mode: "build", title: "uno" });
    expect(messages.every((m) => m.origin === "tui")).toBe(true);
  });

  test("origin falls back to api without the client header", async () => {
    const { call, pushes } = boot();
    const ws = await bindWorkspace(call, "origin");
    await call(`/api/workspaces/${ws.id}/sessions`, {
      method: "POST",
      body: JSON.stringify({ provider: "local", model: "eco" }),
    });
    expect(pushes("session.updated")[0]).toMatchObject({ origin: "api", change: "created" });
  });
});

describe("chat service concurrency", () => {
  let userId: string;

  beforeAll(async () => {
    const [row] = await db
      .insert(user)
      .values({ name: "Seq Test", email: `seq-${Date.now()}@test.local`, emailVerified: true })
      .returning();
    userId = row!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, userId));
  });

  test("concurrent sends keep message seq unique and contiguous", async () => {
    const workspaces = createWorkspaceService(db);
    const chat = createChatService(db);
    const ws = await workspaces.upsertByPath(userId, `/tmp/seq-${Date.now()}`);
    const session = await chat.createSession(userId, ws.id, { provider: "local", model: "eco" });

    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        chat.sendMessage({
          chatSessionId: session.id,
          userId,
          text: `msg ${i}`,
          mode: "plan",
          provider: "local",
          model: "eco",
          clientMessageId: `concurrent-${i}`,
        }),
      ),
    );
    expect(results.every((r) => r.created)).toBe(true);

    const full = await chat.getSessionWithMessages(userId, session.id);
    const seqs = full.messages.map((m) => m.seq);
    expect(seqs).toHaveLength(12);
    expect(new Set(seqs).size).toBe(12);
    expect(seqs).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  });

  test("user push session already reflects mode, title and lastMessageAt", async () => {
    const workspaces = createWorkspaceService(db);
    const chat = createChatService(db);
    const ws = await workspaces.upsertByPath(userId, `/tmp/seq-push-${Date.now()}`);
    const session = await chat.createSession(userId, ws.id, { provider: "local", model: "eco" });

    let pushed: Awaited<ReturnType<typeof chat.getSessionWithMessages>> | null = null;
    await chat.sendMessage({
      chatSessionId: session.id,
      userId,
      text: "primer mensaje",
      mode: "build",
      provider: "local",
      model: "eco",
      onUserMessagePersisted: async ({ session: s }) => {
        pushed = { ...s, messages: [] };
      },
    });
    expect(pushed).toMatchObject({ mode: "build", title: "primer mensaje" });
    expect(pushed!.lastMessageAt).not.toBeNull();
  });
});
