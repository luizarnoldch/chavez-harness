import { afterEach, describe, expect, test } from "bun:test";
import type { ChavezWsClientOptions } from "../ws-client";
import {
  acquireSharedSocket,
  ANY_PUSH,
  sharedSocketCount,
  type SharedSocketDeps,
  type WsClientLike,
} from "../ws/shared-socket";

const WS_ID = "11111111-1111-4111-8111-111111111111";

type Call = { type: string; payload: Record<string, unknown> };

class FakeClient implements WsClientLike {
  calls: Call[] = [];
  closed = false;
  failBind = false;

  constructor(readonly options: ChavezWsClientOptions) {}

  async connect() {
    await this.options.onOpen?.({ reconnect: false });
  }

  async request<T>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
    this.calls.push({ type, payload });
    if (type === "workspace.bind" && this.failBind) throw new Error("bind falló");
    if (type === "workspace.sync") {
      return {
        workspace: { id: WS_ID, daemonDesired: "on" },
        daemonStatus: "online",
        machineStatus: "online",
        chatSessionId: payload.chatSessionId ?? null,
        connections: [],
      } as T;
    }
    return { ok: true } as T;
  }

  close() {
    this.closed = true;
  }

  push(message: Record<string, unknown>) {
    this.options.onPush?.({ push: true, eventId: "e", ...message });
  }

  async reconnect() {
    this.options.onClose?.();
    await this.options.onOpen?.({ reconnect: true });
  }
}

function makeDeps() {
  const clients: FakeClient[] = [];
  const deps: SharedSocketDeps = {
    createClient: (options) => {
      const client = new FakeClient(options);
      clients.push(client);
      return client;
    },
    ensureToken: async () => "token",
  };
  return { deps, clients };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const releases: Array<() => void> = [];
function acquire(...args: Parameters<typeof acquireSharedSocket>) {
  const acquired = acquireSharedSocket(...args);
  releases.push(acquired.release);
  return acquired;
}

afterEach(() => {
  while (releases.length) releases.pop()!();
});

describe("acquireSharedSocket", () => {
  test("dos consumidores del mismo workspace comparten un solo cliente", async () => {
    const { deps, clients } = makeDeps();
    const a = acquire({ workspaceId: WS_ID, path: "/repo" }, deps);
    const b = acquire({ workspaceId: WS_ID, path: "/repo", chatSessionId: "chat-1" }, deps);
    await flush();

    expect(a.socket).toBe(b.socket);
    expect(clients).toHaveLength(1);
    expect(sharedSocketCount()).toBe(1);
  });

  test("al abrir hace user.subscribe + bind (web) + sync y queda En vivo", async () => {
    const { deps, clients } = makeDeps();
    const { socket } = acquire({ workspaceId: WS_ID, path: "/repo", chatSessionId: "chat-1" }, deps);
    await flush();

    expect(clients[0]!.calls.map((c) => c.type)).toEqual([
      "user.subscribe",
      "workspace.bind",
      "workspace.sync",
    ]);
    expect(clients[0]!.calls[1]!.payload).toEqual({
      path: "/repo",
      clientKind: "client",
      clientLabel: "web",
    });
    expect(clients[0]!.calls[2]!.payload).toEqual({ workspaceId: WS_ID, chatSessionId: "chat-1" });
    expect(socket.getSnapshot().live).toBe("live");
    expect(socket.getSnapshot().sync?.daemonStatus).toBe("online");
  });

  test("reparte pushes por tipo y a los suscriptores de todo", async () => {
    const { deps, clients } = makeDeps();
    const { socket } = acquire({ workspaceId: WS_ID, path: "/repo" }, deps);
    await flush();

    const progress: unknown[] = [];
    const presence: unknown[] = [];
    const any: unknown[] = [];
    const off = socket.on("chat.generate.progress", (m) => progress.push(m.data));
    socket.on("daemon.presence", (m) => presence.push(m.data));
    socket.on(ANY_PUSH, (m) => any.push(m.type));

    clients[0]!.push({ type: "chat.generate.progress", data: { phase: "tool" } });
    clients[0]!.push({ type: "daemon.presence", data: { status: "online" } });
    off();
    clients[0]!.push({ type: "chat.generate.progress", data: { phase: "streaming" } });

    expect(progress).toEqual([{ phase: "tool" }]);
    expect(presence).toEqual([{ status: "online" }]);
    expect(any).toEqual(["chat.generate.progress", "daemon.presence", "chat.generate.progress"]);
  });

  test("al reconectar pasa por Conectando… y vuelve a hacer bind + sync", async () => {
    const { deps, clients } = makeDeps();
    const { socket } = acquire({ workspaceId: WS_ID, path: "/repo" }, deps);
    await flush();

    const states: string[] = [];
    socket.subscribeState(() => states.push(socket.getSnapshot().live));
    await clients[0]!.reconnect();

    expect(states[0]).toBe("connecting");
    expect(states.at(-1)).toBe("live");
    expect(clients[0]!.calls.filter((c) => c.type === "user.subscribe")).toHaveLength(2);
    expect(clients[0]!.calls.filter((c) => c.type === "workspace.bind")).toHaveLength(2);
    expect(socket.getSnapshot().openCount).toBe(2);
  });

  test("si el bind falla queda Sin sync con el error", async () => {
    const clients: FakeClient[] = [];
    const deps: SharedSocketDeps = {
      createClient: (options) => {
        const client = new FakeClient(options);
        client.failBind = true;
        clients.push(client);
        return client;
      },
      ensureToken: async () => null,
    };
    const { socket } = acquire({ workspaceId: WS_ID, path: "/repo" }, deps);
    await flush();

    expect(socket.getSnapshot()).toMatchObject({ live: "offline", error: "bind falló" });
  });

  test("el último release cierra el socket", async () => {
    const { deps, clients } = makeDeps();
    const a = acquireSharedSocket({ workspaceId: WS_ID, path: "/repo" }, deps);
    const b = acquireSharedSocket({ workspaceId: WS_ID, path: "/repo" }, deps);
    await flush();

    a.release();
    a.release(); // idempotent
    expect(clients[0]!.closed).toBe(false);
    b.release();
    expect(clients[0]!.closed).toBe(true);
    expect(sharedSocketCount()).toBe(0);
    await expect(a.socket.request("chat.send")).rejects.toThrow("WebSocket no conectado");
  });

  test("workspaces distintos usan sockets distintos", async () => {
    const { deps, clients } = makeDeps();
    acquire({ workspaceId: WS_ID, path: "/repo" }, deps);
    acquire({ workspaceId: "22222222-2222-4222-8222-222222222222", path: "/otro" }, deps);
    await flush();
    expect(clients).toHaveLength(2);
  });

  test("un socket de usuario solo hace user.subscribe, sin bind", async () => {
    const { deps, clients } = makeDeps();
    const { socket } = acquire({}, deps);
    await flush();

    expect(clients[0]!.calls.map((c) => c.type)).toEqual(["user.subscribe"]);
    expect(socket.getSnapshot()).toMatchObject({ live: "live", sync: null, openCount: 1 });
    expect(socket.workspaceId).toBeNull();
  });

  test("pedir workspace después enlaza el socket de usuario existente (un socket por página)", async () => {
    const { deps, clients } = makeDeps();
    const user = acquire({}, deps);
    await flush();
    const ws = acquire({ workspaceId: WS_ID, path: "/repo", chatSessionId: "chat-1" }, deps);
    await flush();

    expect(ws.socket).toBe(user.socket);
    expect(clients).toHaveLength(1);
    expect(sharedSocketCount()).toBe(1);
    expect(clients[0]!.calls.map((c) => c.type)).toEqual([
      "user.subscribe",
      "workspace.bind",
      "workspace.sync",
    ]);
    expect(user.socket.workspaceId).toBe(WS_ID);
    expect(user.socket.getSnapshot().sync?.daemonStatus).toBe("online");

    // A later reconnect restores both.
    await clients[0]!.reconnect();
    expect(clients[0]!.calls.filter((c) => c.type === "workspace.bind")).toHaveLength(2);
  });

  test("pedir usuario cuando ya hay un socket de workspace reutiliza ese socket", async () => {
    const { deps, clients } = makeDeps();
    const ws = acquire({ workspaceId: WS_ID, path: "/repo" }, deps);
    const user = acquire({}, deps);
    await flush();

    expect(user.socket).toBe(ws.socket);
    expect(clients).toHaveLength(1);

    // Releasing the workspace consumer keeps the socket for the user consumer.
    ws.release();
    expect(clients[0]!.closed).toBe(false);
    user.release();
    expect(clients[0]!.closed).toBe(true);
    expect(sharedSocketCount()).toBe(0);
  });

  test("un segundo workspace no se enlaza al mismo socket", async () => {
    const { deps, clients } = makeDeps();
    const a = acquire({ workspaceId: WS_ID, path: "/repo" }, deps);
    const b = acquire({ workspaceId: "22222222-2222-4222-8222-222222222222", path: "/otro" }, deps);
    await flush();

    expect(a.socket).not.toBe(b.socket);
    expect(clients).toHaveLength(2);
    expect(a.socket.workspaceId).toBe(WS_ID);
  });

  test("si user.subscribe falla queda Sin sync", async () => {
    const clients: FakeClient[] = [];
    const deps: SharedSocketDeps = {
      createClient: (options) => {
        const client = new FakeClient(options);
        client.request = async () => {
          throw new Error("suscripción falló");
        };
        clients.push(client);
        return client;
      },
      ensureToken: async () => null,
    };
    const { socket } = acquire({}, deps);
    await flush();
    expect(socket.getSnapshot()).toMatchObject({ live: "offline", error: "suscripción falló" });
  });
});
