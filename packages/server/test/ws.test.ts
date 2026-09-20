import { describe, expect, test } from "bun:test";
import { createPendingRegistry } from "../src/ws/pending.ts";
import { assignDaemonRole } from "../src/ws/bind-role.ts";
import { createHub, type HubConnection } from "../src/ws/hub.ts";
import { createHeartbeatSweeper } from "../src/ws/heartbeat.ts";
import { handleWsMessage, onConnectionClosed, type HandlerDeps } from "../src/ws/handlers.ts";
import { createApp } from "../src/app.ts";
import { websocket } from "hono/bun";
import { createMemoryChatService, createMemoryWorkspaceService } from "./memory-services.ts";

const WS_ID = "11111111-1111-4111-8111-111111111111";

function mockSocket() {
  const sent: string[] = [];
  return {
    sent,
    socket: {
      send: (data: string) => {
        sent.push(data);
      },
      close: () => {},
    },
  };
}

function baseConn(
  hub: ReturnType<typeof createHub>,
  overrides: Partial<HubConnection> = {},
): HubConnection {
  const { socket } = mockSocket();
  const conn: HubConnection = {
    connectionId: overrides.connectionId ?? crypto.randomUUID(),
    userId: overrides.userId ?? "user-1",
    socket: overrides.socket ?? socket,
    clientKind: overrides.clientKind ?? null,
    workspaceId: overrides.workspaceId ?? null,
    workspacePath: overrides.workspacePath ?? null,
    daemonId: overrides.daemonId ?? null,
    role: overrides.role ?? null,
    machineId: overrides.machineId ?? null,
    hostname: overrides.hostname ?? null,
    lastHeartbeatAt: overrides.lastHeartbeatAt ?? Date.now(),
  };
  hub.register(conn);
  return conn;
}

function testDeps(hub: ReturnType<typeof createHub>): HandlerDeps {
  const workspaces = createMemoryWorkspaceService();
  return {
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
        userId: "user-1",
        provider: "cursor",
        unwrapToken: "token",
        expiresAt: Date.now() + 60_000,
      }),
      consume: () => null,
      peek: () => undefined,
      size: () => 0,
    },
  };
}

describe("ws hub", () => {
  test("findDaemon returns primary only", () => {
    const hub = createHub();
    const primary = baseConn(hub, {
      connectionId: "d1",
      clientKind: "daemon",
      workspaceId: WS_ID,
      role: "primary",
    });
    baseConn(hub, {
      connectionId: "d2",
      clientKind: "daemon",
      workspaceId: WS_ID,
      role: "standby",
    });

    expect(hub.findDaemon("user-1", WS_ID)?.connectionId).toBe(primary.connectionId);
  });

  test("assignDaemonRole: first is primary, second standby", () => {
    const hub = createHub();
    const a = baseConn(hub, { connectionId: "a", workspaceId: WS_ID });
    const r1 = assignDaemonRole(hub, a, "daemon-a");
    expect(r1.role).toBe("primary");

    const b = baseConn(hub, { connectionId: "b", workspaceId: WS_ID });
    const r2 = assignDaemonRole(hub, b, "daemon-b");
    expect(r2.role).toBe("standby");
  });

  test("assignDaemonRole reclaims same daemonId", () => {
    const hub = createHub();
    const closed: string[] = [];
    const a = baseConn(hub, {
      connectionId: "old",
      workspaceId: WS_ID,
      socket: {
        send: () => {},
        close: () => closed.push("old"),
      },
    });
    assignDaemonRole(hub, a, "same");

    const b = baseConn(hub, { connectionId: "new", workspaceId: WS_ID });
    const result = assignDaemonRole(hub, b, "same");
    expect(result.closedZombieIds).toContain("old");
    expect(result.role).toBe("primary");
    expect(hub.get("old")).toBeUndefined();
  });

  test("broadcastToWorkspace scopes by workspace", () => {
    const hub = createHub();
    const aSent: string[] = [];
    const bSent: string[] = [];
    baseConn(hub, {
      connectionId: "a",
      workspaceId: WS_ID,
      socket: { send: (d) => aSent.push(d), close: () => {} },
    });
    baseConn(hub, {
      connectionId: "b",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      socket: { send: (d) => bSent.push(d), close: () => {} },
    });

    hub.broadcastToWorkspace("user-1", WS_ID, { hello: true });
    expect(aSent).toHaveLength(1);
    expect(bSent).toHaveLength(0);
  });

  test("listForWorkspace returns only bound connections", () => {
    const hub = createHub();
    baseConn(hub, {
      connectionId: "in",
      workspaceId: WS_ID,
      clientKind: "client",
    });
    baseConn(hub, {
      connectionId: "out",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      clientKind: "client",
    });
    baseConn(hub, {
      connectionId: "unbound",
      workspaceId: null,
      clientKind: "client",
    });

    const list = hub.listForWorkspace("user-1", WS_ID);
    expect(list.map((c) => c.connectionId)).toEqual(["in"]);
  });
});

describe("connection.status push", () => {
  test("workspace.bind emits connections list", async () => {
    const hub = createHub();
    const deps = testDeps(hub);
    const path = `/tmp/presence-${Date.now()}`;

    const clientSent: string[] = [];
    const client = baseConn(hub, {
      connectionId: "client-a",
      userId: "user-presence",
      socket: {
        send: (data) => clientSent.push(data),
        close: () => {},
      },
    });

    await handleWsMessage(
      client,
      JSON.stringify({
        type: "workspace.bind",
        id: "bind-1",
        path,
        clientKind: "client",
      }),
      deps,
    );

    const statusMsg = clientSent
      .map((raw) => JSON.parse(raw) as Record<string, unknown>)
      .find((msg) => msg.type === "connection.status");
    expect(statusMsg).toBeTruthy();
    const data = statusMsg!.data as {
      connections: Array<{ connectionId: string; clientKind: string | null }>;
      daemon: string;
    };
    expect(data.daemon).toBe("offline");
    expect(data.connections.some((c) => c.connectionId === "client-a")).toBe(true);
    expect(data.connections.some((c) => c.clientKind === "client")).toBe(true);
  });
});

describe("pending registry", () => {
  test("complete resolves wait", async () => {
    const pending = createPendingRegistry(1000);
    const p = pending.wait<string>("r1");
    expect(pending.complete("r1", "ok")).toBe(true);
    expect(await p).toBe("ok");
  });
});

describe("workspace.ping rpc", () => {
  test("proxies to daemon and returns result", async () => {
    const hub = createHub();
    const deps = testDeps(hub);

    const daemonSent: string[] = [];
    const daemon = baseConn(hub, {
      connectionId: "daemon",
      clientKind: "daemon",
      workspaceId: WS_ID,
      workspacePath: "/tmp/proj",
      role: "primary",
      socket: {
        send: (data) => daemonSent.push(data),
        close: () => {},
      },
    });

    const clientSent: string[] = [];
    const client = baseConn(hub, {
      connectionId: "client",
      clientKind: "client",
      workspaceId: WS_ID,
      workspacePath: "/tmp/proj",
      socket: {
        send: (data) => clientSent.push(data),
        close: () => {},
      },
    });

    const pingPromise = handleWsMessage(
      client,
      JSON.stringify({
        type: "workspace.ping",
        id: "ping-1",
        workspaceId: WS_ID,
      }),
      deps,
    );

    await Bun.sleep(10);
    expect(daemonSent.length).toBe(1);
    const dispatch = JSON.parse(daemonSent[0]!);
    expect(dispatch.type).toBe("workspace.ping.dispatch");
    expect(dispatch.requestId).toBe("ping-1");

    await handleWsMessage(
      daemon,
      JSON.stringify({
        type: "workspace.ping.result",
        requestId: "ping-1",
        ok: true,
        data: { pong: true, path: "/tmp/proj" },
      }),
      deps,
    );

    await pingPromise;
    expect(clientSent.length).toBe(1);
    const reply = JSON.parse(clientSent[0]!);
    expect(reply).toMatchObject({
      type: "workspace.ping",
      id: "ping-1",
      ok: true,
      data: { pong: true, path: "/tmp/proj" },
    });
  });

  test("errors when no daemon", async () => {
    const hub = createHub();
    const deps = testDeps(hub);

    const clientSent: string[] = [];
    const client = baseConn(hub, {
      connectionId: "client",
      clientKind: "client",
      workspaceId: WS_ID,
      workspacePath: "/tmp/proj",
      socket: {
        send: (data) => clientSent.push(data),
        close: () => {},
      },
    });

    await handleWsMessage(
      client,
      JSON.stringify({
        type: "workspace.ping",
        id: "ping-2",
        workspaceId: WS_ID,
      }),
      deps,
    );

    const reply = JSON.parse(clientSent[0]!);
    expect(reply.ok).toBe(false);
    expect(reply.error).toContain("No daemon bound");
  });
});

describe("ws route auth", () => {
  test("GET /ws without token returns 401", async () => {
    const workspaces = createMemoryWorkspaceService();
    const response = await createApp({
      ws: { resolveUserId: async () => null },
      workspaces,
      chat: createMemoryChatService(workspaces),
    }).request("/ws");
    expect(response.status).toBe(401);
  });

  test("websocket bind + ping round-trip with injected auth", async () => {
    const workspaces = createMemoryWorkspaceService();
    const chat = createMemoryChatService(workspaces);
    const app = createApp({
      ws: { resolveUserId: async () => "user-test" },
      workspaces,
      chat,
    });

    const running = Bun.serve({
      fetch: app.fetch,
      websocket,
      port: 0,
    });

    function connect(): Promise<WebSocket> {
      const socket = new WebSocket(`ws://127.0.0.1:${running.port}/ws?token=test`);
      return new Promise((resolve, reject) => {
        socket.addEventListener("open", () => resolve(socket), { once: true });
        socket.addEventListener("error", () => reject(new Error("open failed")), { once: true });
      });
    }

    function waitForType(socket: WebSocket, type: string): Promise<Record<string, unknown>> {
      return new Promise((resolve, reject) => {
        const onMessage = (event: MessageEvent) => {
          const msg = JSON.parse(String(event.data)) as Record<string, unknown>;
          if (msg.type !== type) return;
          socket.removeEventListener("message", onMessage);
          resolve(msg);
        };
        socket.addEventListener("message", onMessage);
        socket.addEventListener(
          "error",
          () => {
            socket.removeEventListener("message", onMessage);
            reject(new Error("message error"));
          },
          { once: true },
        );
      });
    }

    try {
      const daemon = await connect();
      const client = await connect();

      const daemonBindP = waitForType(daemon, "workspace.bind");
      daemon.send(
        JSON.stringify({
          type: "workspace.bind",
          id: "b1",
          path: "/tmp/ws",
          clientKind: "daemon",
          daemonId: "d-1",
        }),
      );
      const daemonBindReply = (await daemonBindP) as {
        ok: boolean;
        data: { workspaceId: string };
      };
      expect(daemonBindReply.ok).toBe(true);
      expect(daemonBindReply.data.workspaceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

      const clientBindP = waitForType(client, "workspace.bind");
      client.send(
        JSON.stringify({
          type: "workspace.bind",
          id: "b2",
          path: "/tmp/ws",
          clientKind: "client",
        }),
      );
      const clientBindReply = (await clientBindP) as {
        ok: boolean;
        data: { workspaceId: string };
      };
      expect(clientBindReply.ok).toBe(true);
      expect(clientBindReply.data.workspaceId).toBe(daemonBindReply.data.workspaceId);

      const pingReplyP = waitForType(client, "workspace.ping");
      const dispatchP = waitForType(daemon, "workspace.ping.dispatch");

      client.send(
        JSON.stringify({
          type: "workspace.ping",
          id: "p1",
          workspaceId: clientBindReply.data.workspaceId,
        }),
      );

      const dispatch = await dispatchP;
      expect(dispatch.type).toBe("workspace.ping.dispatch");
      expect(typeof dispatch.requestId).toBe("string");
      expect(typeof dispatch.path).toBe("string");

      daemon.send(
        JSON.stringify({
          type: "workspace.ping.result",
          requestId: dispatch.requestId,
          ok: true,
          data: { pong: true, path: dispatch.path },
        }),
      );

      const pingReply = await pingReplyP;
      expect(pingReply.ok).toBe(true);
      expect((pingReply.data as { pong: boolean }).pong).toBe(true);

      daemon.close();
      client.close();
    } finally {
      running.stop(true);
    }
  });
});

describe("host + daemon desired", () => {
  test("host.bind emits machine.presence online", async () => {
    const hub = createHub();
    const deps = testDeps(hub);
    const sent: string[] = [];
    const host = baseConn(hub, {
      connectionId: "host-1",
      userId: "user-host",
      socket: {
        send: (data) => sent.push(data),
        close: () => {},
      },
    });

    await handleWsMessage(
      host,
      JSON.stringify({
        type: "host.bind",
        id: "hb1",
        machineId: "machine-abc",
        hostname: "devbox",
      }),
      deps,
    );

    expect(hub.findHost("user-host")?.machineId).toBe("machine-abc");
    expect(hub.machineStatus("user-host")).toBe("online");

    const presence = sent
      .map((raw) => JSON.parse(raw) as Record<string, unknown>)
      .find((msg) => msg.type === "machine.presence");
    expect(presence).toBeTruthy();
    expect((presence!.data as { status: string }).status).toBe("online");
  });

  test("workspace.daemon.set without host returns NO_HOST error", async () => {
    const hub = createHub();
    const deps = testDeps(hub);
    const path = `/tmp/daemon-set-${Date.now()}`;
    const sent: string[] = [];
    const client = baseConn(hub, {
      connectionId: "c1",
      userId: "user-nohost",
      socket: {
        send: (data) => sent.push(data),
        close: () => {},
      },
    });

    await handleWsMessage(
      client,
      JSON.stringify({
        type: "workspace.bind",
        id: "b1",
        path,
        clientKind: "client",
      }),
      deps,
    );

    const bindReply = sent
      .map((raw) => JSON.parse(raw) as { type: string; data?: { workspaceId: string } })
      .find((m) => m.type === "workspace.bind");
    const workspaceId = bindReply!.data!.workspaceId;
    sent.length = 0;

    await handleWsMessage(
      client,
      JSON.stringify({
        type: "workspace.daemon.set",
        id: "ds1",
        workspaceId,
        desired: "on",
        source: "web",
      }),
      deps,
    );

    const reply = JSON.parse(sent[sent.length - 1]!);
    expect(reply.ok).toBe(false);
    expect(reply.error).toContain("Host");
  });

  test("daemon.start.dispatch round-trip via host", async () => {
    const hub = createHub();
    const deps = testDeps(hub);
    const path = `/tmp/daemon-start-${Date.now()}`;

    const hostSent: string[] = [];
    const host = baseConn(hub, {
      connectionId: "host-2",
      userId: "user-start",
      socket: {
        send: (data) => hostSent.push(data),
        close: () => {},
      },
    });
    await handleWsMessage(
      host,
      JSON.stringify({
        type: "host.bind",
        id: "hb2",
        machineId: "m2",
      }),
      deps,
    );

    const clientSent: string[] = [];
    const client = baseConn(hub, {
      connectionId: "client-2",
      userId: "user-start",
      socket: {
        send: (data) => clientSent.push(data),
        close: () => {},
      },
    });

    await handleWsMessage(
      client,
      JSON.stringify({
        type: "workspace.bind",
        id: "b2",
        path,
        clientKind: "client",
      }),
      deps,
    );
    const bindReply = clientSent
      .map((raw) => JSON.parse(raw) as { type: string; data?: { workspaceId: string } })
      .find((m) => m.type === "workspace.bind");
    const workspaceId = bindReply!.data!.workspaceId;
    clientSent.length = 0;
    hostSent.length = 0;

    const setPromise = handleWsMessage(
      client,
      JSON.stringify({
        type: "workspace.daemon.set",
        id: "ds2",
        workspaceId,
        desired: "on",
        source: "web",
      }),
      deps,
    );

    await Bun.sleep(20);
    const dispatch = hostSent
      .map((raw) => JSON.parse(raw) as Record<string, unknown>)
      .find((m) => m.type === "daemon.start.dispatch");
    expect(dispatch).toBeTruthy();
    expect(dispatch!.path).toBe(path);

    await handleWsMessage(
      host,
      JSON.stringify({
        type: "daemon.start.result",
        requestId: dispatch!.requestId,
        ok: true,
        data: { pid: 12345, spawned: true },
      }),
      deps,
    );

    await setPromise;
    const setReply = clientSent
      .map((raw) => JSON.parse(raw) as { type: string; ok?: boolean; data?: { daemonDesired: string } })
      .find((m) => m.type === "workspace.daemon.set");
    expect(setReply?.ok).toBe(true);
    expect(setReply?.data?.daemonDesired).toBe("on");
  });

  test("client disconnect emits connection.status", async () => {
    const hub = createHub();
    const deps = testDeps(hub);
    const path = `/tmp/client-close-${Date.now()}`;

    const peerSent: string[] = [];
    const peer = baseConn(hub, {
      connectionId: "peer",
      userId: "user-close",
      socket: {
        send: (data) => peerSent.push(data),
        close: () => {},
      },
    });
    await handleWsMessage(
      peer,
      JSON.stringify({
        type: "workspace.bind",
        id: "bp",
        path,
        clientKind: "client",
      }),
      deps,
    );

    const leaving = baseConn(hub, {
      connectionId: "leaving",
      userId: "user-close",
      socket: {
        send: () => {},
        close: () => {},
      },
    });
    await handleWsMessage(
      leaving,
      JSON.stringify({
        type: "workspace.bind",
        id: "bl",
        path,
        clientKind: "client",
      }),
      deps,
    );
    peerSent.length = 0;

    onConnectionClosed(leaving, deps);

    const status = peerSent
      .map((raw) => JSON.parse(raw) as Record<string, unknown>)
      .find((m) => m.type === "connection.status");
    expect(status).toBeTruthy();
    const connections = (status!.data as { connections: Array<{ connectionId: string }> })
      .connections;
    expect(connections.some((c) => c.connectionId === "leaving")).toBe(false);
    expect(connections.some((c) => c.connectionId === "peer")).toBe(true);
  });

  test("tui cannot turn off web-pinned daemon", async () => {
    const hub = createHub();
    const deps = testDeps(hub);
    const path = `/tmp/pin-${Date.now()}`;

    const hostSent: string[] = [];
    const host = baseConn(hub, {
      connectionId: "host-pin",
      userId: "user-pin",
      socket: {
        send: (data) => hostSent.push(data),
        close: () => {},
      },
    });
    await handleWsMessage(
      host,
      JSON.stringify({ type: "host.bind", id: "h", machineId: "mp" }),
      deps,
    );

    const clientSent: string[] = [];
    const client = baseConn(hub, {
      connectionId: "c-pin",
      userId: "user-pin",
      socket: {
        send: (data) => clientSent.push(data),
        close: () => {},
      },
    });
    await handleWsMessage(
      client,
      JSON.stringify({
        type: "workspace.bind",
        id: "b",
        path,
        clientKind: "client",
      }),
      deps,
    );
    const workspaceId = clientSent
      .map((raw) => JSON.parse(raw) as { type: string; data?: { workspaceId: string } })
      .find((m) => m.type === "workspace.bind")!.data!.workspaceId;

    const arm = async (desired: "on" | "off", source: "web" | "tui") => {
      clientSent.length = 0;
      hostSent.length = 0;
      const p = handleWsMessage(
        client,
        JSON.stringify({
          type: "workspace.daemon.set",
          id: crypto.randomUUID(),
          workspaceId,
          desired,
          source,
        }),
        deps,
      );
      await Bun.sleep(15);
      const dispatch = hostSent
        .map((raw) => JSON.parse(raw) as Record<string, unknown>)
        .find(
          (m) =>
            m.type === "daemon.start.dispatch" || m.type === "daemon.stop.dispatch",
        );
      if (dispatch) {
        await handleWsMessage(
          host,
          JSON.stringify({
            type:
              dispatch.type === "daemon.start.dispatch"
                ? "daemon.start.result"
                : "daemon.stop.result",
            requestId: dispatch.requestId,
            ok: true,
            data:
              dispatch.type === "daemon.start.dispatch"
                ? { pid: 1, spawned: true }
                : { stopped: true },
          }),
          deps,
        );
      }
      await p;
      return JSON.parse(clientSent.find((r) => JSON.parse(r).type === "workspace.daemon.set")!);
    };

    const onReply = await arm("on", "web");
    expect(onReply.ok).toBe(true);
    expect(onReply.data.daemonDesiredSource).toBe("web");

    const offReply = await arm("off", "tui");
    expect(offReply.ok).toBe(true);
    expect(offReply.data.ignored).toBe(true);
    expect(offReply.data.daemonDesired).toBe("on");
  });
});

describe("health", () => {
  test("GET /health returns ok", async () => {
    const workspaces = createMemoryWorkspaceService();
    const response = await createApp({
      ws: { resolveUserId: async () => null },
      workspaces,
      chat: createMemoryChatService(workspaces),
    }).request("/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
