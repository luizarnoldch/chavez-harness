import { describe, expect, test } from "bun:test";
import { createHub, type HubConnection } from "../src/ws/hub.ts";
import { createPendingRegistry } from "../src/ws/pending.ts";
import { createHeartbeatSweeper } from "../src/ws/heartbeat.ts";
import { handleWsMessage, type HandlerDeps } from "../src/ws/handlers.ts";
import { applyDaemonDesired } from "../src/ws/daemon-desired.ts";
import { createMemoryChatService, createMemoryWorkspaceService } from "./memory-services.ts";

type Pushed = Record<string, any>;

function client(hub: ReturnType<typeof createHub>, id: string, userId = "user-sync") {
  const sent: Pushed[] = [];
  const conn: HubConnection = {
    connectionId: id,
    userId,
    socket: { send: (raw: string) => sent.push(JSON.parse(raw)), close: () => {} },
    clientKind: null,
    clientLabel: null,
    observeUser: false,
    workspaceId: null,
    workspacePath: null,
    daemonId: null,
    role: null,
    machineId: null,
    hostname: null,
    lastHeartbeatAt: Date.now(),
  };
  hub.register(conn);
  return {
    conn,
    sent,
    pushes: (type: string) => sent.filter((m) => m.push === true && m.type === type),
    reply: (type: string) => sent.find((m) => m.push !== true && m.type === type),
    clear: () => {
      sent.length = 0;
    },
  };
}

function setup() {
  const hub = createHub();
  const workspaces = createMemoryWorkspaceService();
  const deps: HandlerDeps = {
    hub,
    pending: createPendingRegistry(2000),
    heartbeat: createHeartbeatSweeper(hub),
    workspaces,
    chat: createMemoryChatService(workspaces),
    providers: {
      listStatus: async () => [],
      upsert: async () => {
        throw new Error("not implemented in memory test");
      },
      isConfigured: async () => false,
      decrypt: async () => {
        throw new Error("not configured");
      },
    },
    jobs: {
      create: () => ({
        jobId: crypto.randomUUID(),
        userId: "user-sync",
        provider: "cursor",
        unwrapToken: "token",
        expiresAt: Date.now() + 60_000,
      }),
      consume: () => null,
      peek: () => undefined,
      size: () => 0,
    },
  };
  const send = (c: { conn: HubConnection }, message: Record<string, unknown>) =>
    handleWsMessage(c.conn, JSON.stringify(message), deps);
  return { hub, deps, send };
}

async function bind(
  send: ReturnType<typeof setup>["send"],
  c: ReturnType<typeof client>,
  path: string,
  clientLabel?: "tui" | "web",
) {
  await send(c, {
    type: "workspace.bind",
    id: `bind-${c.conn.connectionId}`,
    path,
    clientKind: "client",
    ...(clientLabel ? { clientLabel } : {}),
  });
  return c.reply("workspace.bind")!.data.workspaceId as string;
}

describe("user.subscribe observers", () => {
  test("replies with machine status and marks the connection as observer", async () => {
    const { hub, send } = setup();
    const observer = client(hub, "obs");
    await send(observer, { type: "user.subscribe", id: "sub-1" });
    expect(observer.reply("user.subscribe")).toMatchObject({
      ok: true,
      data: { subscribed: true, machineStatus: "offline" },
    });
    expect(hub.get("obs")?.observeUser).toBe(true);
  });

  test("observer gets workspace broadcasts it is not bound to, bound observers only once", async () => {
    const { hub, send } = setup();
    const path = `/tmp/obs-${Date.now()}`;
    const tui = client(hub, "tui");
    const observer = client(hub, "observer");
    const boundObserver = client(hub, "bound-observer");
    const stranger = client(hub, "stranger", "another-user");

    await send(observer, { type: "user.subscribe", id: "s1" });
    await send(stranger, { type: "user.subscribe", id: "s2" });
    const workspaceId = await bind(send, tui, path, "tui");
    await bind(send, boundObserver, path, "web");
    await send(boundObserver, { type: "user.subscribe", id: "s3" });

    for (const c of [tui, observer, boundObserver, stranger]) c.clear();
    await send(tui, { type: "session.create", id: "sc-1", workspaceId });

    expect(observer.pushes("session.updated")).toHaveLength(1);
    expect(boundObserver.pushes("session.updated")).toHaveLength(1);
    expect(tui.pushes("session.updated")).toHaveLength(1);
    expect(stranger.pushes("session.updated")).toHaveLength(0);
    expect(observer.pushes("session.updated")[0]).toMatchObject({
      origin: "tui",
      change: "created",
    });
  });
});

describe("clientLabel on bind", () => {
  test("is stored, exposed in connection.status and echoed in the bind reply", async () => {
    const { hub, send } = setup();
    const path = `/tmp/label-${Date.now()}`;
    const web = client(hub, "web-1");
    const tui = client(hub, "tui-1");

    await bind(send, web, path, "web");
    web.clear();
    await bind(send, tui, path, "tui");

    expect(tui.reply("workspace.bind")?.data.clientLabel).toBe("tui");
    expect(hub.get("tui-1")?.clientLabel).toBe("tui");
    const status = web.pushes("connection.status").at(-1)!;
    expect(status.data.daemonDesired).toBe("off");
    const labels = (status.data.connections as Array<{ clientLabel: string | null }>)
      .map((c) => c.clientLabel)
      .sort();
    expect(labels).toEqual(["tui", "web"]);
  });

  test("tui bind emits workspace.updated to the whole user except the binder", async () => {
    const { hub, send } = setup();
    const path = `/tmp/wsupd-${Date.now()}`;
    const tui = client(hub, "tui-2");
    const dashboard = client(hub, "dashboard");
    const other = client(hub, "other-user", "someone-else");
    await send(dashboard, { type: "user.subscribe", id: "s" });

    await bind(send, tui, path, "tui");

    expect(tui.pushes("workspace.updated")).toHaveLength(0);
    const pushes = dashboard.pushes("workspace.updated");
    expect(pushes).toHaveLength(1);
    expect(pushes[0]).toMatchObject({
      origin: "tui",
      data: { reason: "bind", workspace: { path }, daemonStatus: "offline" },
    });
    expect(other.pushes("workspace.updated")).toHaveLength(0);
  });

  test("web bind does not announce workspace.updated", async () => {
    const { hub, send } = setup();
    const web = client(hub, "web-2");
    const dashboard = client(hub, "dashboard-2");
    await send(dashboard, { type: "user.subscribe", id: "s" });
    await bind(send, web, `/tmp/webonly-${Date.now()}`, "web");
    expect(dashboard.pushes("workspace.updated")).toHaveLength(0);
  });
});

describe("workspace.updated on daemon desired", () => {
  test("applyDaemonDesired announces the new desired state with the source as origin", async () => {
    const { hub, deps, send } = setup();
    const web = client(hub, "web-d");
    const dashboard = client(hub, "dash-d");
    await send(dashboard, { type: "user.subscribe", id: "s" });
    const workspaceId = await bind(send, web, `/tmp/desired-${Date.now()}`, "web");
    dashboard.clear();

    // No host connected: "off" settles right away without dispatching.
    await applyDaemonDesired({
      hub,
      pending: deps.pending,
      workspaces: deps.workspaces,
      userId: "user-sync",
      workspaceId,
      desired: "off",
      source: "web",
    });

    const pushes = dashboard.pushes("workspace.updated");
    expect(pushes).toHaveLength(1);
    expect(pushes[0]).toMatchObject({
      origin: "web",
      data: { reason: "daemon.desired", workspace: { id: workspaceId, daemonDesired: "off" } },
    });
  });

  test("workspace.daemon.set puts daemonDesired into connection.status", async () => {
    const { hub, send } = setup();
    const web = client(hub, "web-e");
    const workspaceId = await bind(send, web, `/tmp/desired2-${Date.now()}`, "web");
    web.clear();
    await send(web, {
      type: "workspace.daemon.set",
      id: "d1",
      workspaceId,
      desired: "off",
      source: "web",
    });
    expect(web.pushes("connection.status").at(-1)?.data.daemonDesired).toBe("off");
  });
});

describe("session.update", () => {
  async function withSession() {
    const env = setup();
    const path = `/tmp/supd-${Date.now()}-${Math.random()}`;
    const tui = client(env.hub, "tui-u");
    const web = client(env.hub, "web-u");
    const dashboard = client(env.hub, "dash-u");
    await env.send(dashboard, { type: "user.subscribe", id: "s" });
    const workspaceId = await bind(env.send, tui, path, "tui");
    await bind(env.send, web, path, "web");
    await env.send(tui, { type: "session.create", id: "sc", workspaceId });
    const sessionId = tui.reply("session.create")!.data.id as string;
    for (const c of [tui, web, dashboard]) c.clear();
    return { ...env, tui, web, dashboard, workspaceId, sessionId };
  }

  test("persists the mode, broadcasts to peers and observers but not back to the sender", async () => {
    const { send, tui, web, dashboard, sessionId } = await withSession();
    await send(tui, { type: "session.update", id: "u1", chatSessionId: sessionId, mode: "build" });

    expect(tui.reply("session.update")).toMatchObject({
      ok: true,
      data: { changed: ["mode"], session: { id: sessionId, mode: "build" } },
    });
    expect(tui.pushes("session.updated")).toHaveLength(0);
    for (const peer of [web, dashboard]) {
      const pushes = peer.pushes("session.updated");
      expect(pushes).toHaveLength(1);
      expect(pushes[0]).toMatchObject({
        origin: "tui",
        change: "settings",
        changed: ["mode"],
        data: { id: sessionId, mode: "build" },
      });
    }
  });

  test("reports every changed field and normalizes the title", async () => {
    const { send, web, tui, sessionId } = await withSession();
    await send(web, {
      type: "session.update",
      id: "u2",
      chatSessionId: sessionId,
      provider: "local",
      model: "eco",
      title: "  Mi sesión  ",
    });
    expect(web.reply("session.update")?.data).toMatchObject({
      changed: ["provider", "model", "title"],
      session: { provider: "local", model: "eco", title: "Mi sesión" },
    });
    expect(tui.pushes("session.updated")[0]?.origin).toBe("web");
  });

  test("a no-op update does not broadcast", async () => {
    const { send, tui, web, sessionId } = await withSession();
    await send(tui, { type: "session.update", id: "u3", chatSessionId: sessionId, mode: "plan" });
    expect(tui.reply("session.update")?.data.changed).toEqual([]);
    expect(web.pushes("session.updated")).toHaveLength(0);
  });

  test("unknown session replies with an error", async () => {
    const { send, tui } = await withSession();
    await send(tui, {
      type: "session.update",
      id: "u4",
      chatSessionId: crypto.randomUUID(),
      mode: "build",
    });
    expect(tui.reply("session.update")).toMatchObject({ ok: false, error: "Sesión no encontrada" });
  });
});

describe("chat.send push consistency", () => {
  test("user push carries the updated session and session.updated is emitted once", async () => {
    const env = setup();
    const path = `/tmp/send-${Date.now()}`;
    const tui = client(env.hub, "tui-s");
    const dashboard = client(env.hub, "dash-s");
    await env.send(dashboard, { type: "user.subscribe", id: "s" });
    const workspaceId = await bind(env.send, tui, path, "tui");
    await env.send(tui, {
      type: "session.create",
      id: "sc",
      workspaceId,
      provider: "local",
      model: "eco",
    });
    const sessionId = tui.reply("session.create")!.data.id as string;
    dashboard.clear();

    await env.send(tui, {
      type: "chat.send",
      id: "cs",
      chatSessionId: sessionId,
      text: "hola mundo",
      mode: "build",
      provider: "local",
      model: "eco",
    });

    const messages = dashboard.pushes("session.message.created");
    expect(messages.map((m) => m.data.message.role)).toEqual(["user", "assistant"]);
    expect(messages[0]?.data.session).toMatchObject({
      mode: "build",
      title: "hola mundo",
    });
    expect(messages[0]?.data.session.lastMessageAt).not.toBeNull();
    expect(messages.every((m) => m.origin === "tui")).toBe(true);
    const updates = dashboard.pushes("session.updated");
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ origin: "tui", change: "message" });
  });

  test("session.delete announces origin to observers", async () => {
    const env = setup();
    const tui = client(env.hub, "tui-x");
    const web = client(env.hub, "web-x");
    const dashboard = client(env.hub, "dash-x");
    await env.send(dashboard, { type: "user.subscribe", id: "s" });
    const path = `/tmp/del-${Date.now()}`;
    const workspaceId = await bind(env.send, tui, path, "tui");
    await bind(env.send, web, path, "web");
    await env.send(tui, { type: "session.create", id: "sc", workspaceId });
    const sessionId = tui.reply("session.create")!.data.id as string;
    dashboard.clear();

    await env.send(web, { type: "session.delete", id: "del", chatSessionId: sessionId });

    expect(dashboard.pushes("session.deleted")[0]).toMatchObject({
      origin: "web",
      data: { workspaceId, chatSessionId: sessionId },
    });
  });
});
