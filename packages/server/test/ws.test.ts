import { describe, expect, test } from "bun:test";
import { createPendingRegistry } from "../src/ws/pending.ts";
import { assignDaemonRole } from "../src/ws/bind-role.ts";
import { createHub, type HubConnection } from "../src/ws/hub.ts";
import { createHeartbeatSweeper } from "../src/ws/heartbeat.ts";
import { handleWsMessage } from "../src/ws/handlers.ts";
import { createApp } from "../src/app.ts";
import { websocket } from "hono/bun";

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
    lastHeartbeatAt: overrides.lastHeartbeatAt ?? Date.now(),
  };
  hub.register(conn);
  return conn;
}

describe("ws hub", () => {
  test("findDaemon returns primary only", () => {
    const hub = createHub();
    const primary = baseConn(hub, {
      connectionId: "d1",
      clientKind: "daemon",
      workspaceId: "ws1",
      role: "primary",
    });
    baseConn(hub, {
      connectionId: "d2",
      clientKind: "daemon",
      workspaceId: "ws1",
      role: "standby",
    });

    expect(hub.findDaemon("user-1", "ws1")?.connectionId).toBe(primary.connectionId);
  });

  test("assignDaemonRole: first is primary, second standby", () => {
    const hub = createHub();
    const a = baseConn(hub, { connectionId: "a", workspaceId: "ws1" });
    const r1 = assignDaemonRole(hub, a, "daemon-a");
    expect(r1.role).toBe("primary");

    const b = baseConn(hub, { connectionId: "b", workspaceId: "ws1" });
    const r2 = assignDaemonRole(hub, b, "daemon-b");
    expect(r2.role).toBe("standby");
  });

  test("assignDaemonRole reclaims same daemonId", () => {
    const hub = createHub();
    const closed: string[] = [];
    const a = baseConn(hub, {
      connectionId: "old",
      workspaceId: "ws1",
      socket: {
        send: () => {},
        close: () => closed.push("old"),
      },
    });
    assignDaemonRole(hub, a, "same");

    const b = baseConn(hub, { connectionId: "new", workspaceId: "ws1" });
    const result = assignDaemonRole(hub, b, "same");
    expect(result.closedZombieIds).toContain("old");
    expect(result.role).toBe("primary");
    expect(hub.get("old")).toBeUndefined();
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
    const pending = createPendingRegistry(2000);
    const heartbeat = createHeartbeatSweeper(hub);
    const deps = { hub, pending, heartbeat };

    const daemonSent: string[] = [];
    const daemon = baseConn(hub, {
      connectionId: "daemon",
      clientKind: "daemon",
      workspaceId: "user-1:/tmp/proj",
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
      workspaceId: "user-1:/tmp/proj",
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
        workspaceId: "user-1:/tmp/proj",
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
    const pending = createPendingRegistry(2000);
    const heartbeat = createHeartbeatSweeper(hub);
    const deps = { hub, pending, heartbeat };

    const clientSent: string[] = [];
    const client = baseConn(hub, {
      connectionId: "client",
      clientKind: "client",
      workspaceId: "user-1:/tmp/proj",
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
        workspaceId: "user-1:/tmp/proj",
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
    const app = createApp({
      ws: { resolveUserId: async () => null },
    });
    const response = await app.request("/ws");
    expect(response.status).toBe(401);
  });

  test("websocket bind + ping round-trip with injected auth", async () => {
    const app = createApp({
      ws: { resolveUserId: async () => "user-test" },
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

describe("health", () => {
  test("GET /health returns ok", async () => {
    const response = await createApp({
      ws: { resolveUserId: async () => null },
    }).request("/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
