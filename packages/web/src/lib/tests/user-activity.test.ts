import { afterEach, describe, expect, test } from "bun:test";
import type { DashboardSnapshot } from "@chavez-harness/shared";
import type { ChavezWsClientOptions } from "../ws-client";
import {
  acquireSharedSocket,
  sharedSocketCount,
  type SharedSocketDeps,
  type WsClientLike,
} from "../ws/shared-socket";
import { UserActivityStore, acquireUserActivity } from "../ws/user-activity";

const WS = "11111111-1111-4111-8111-111111111111";
const USER = "33333333-3333-4333-8333-333333333333";
const NOW = "2026-09-30T12:00:00.000Z";

class FakeClient implements WsClientLike {
  calls: string[] = [];
  closed = false;
  constructor(readonly options: ChavezWsClientOptions) {}
  async connect() {
    await this.options.onOpen?.({ reconnect: false });
  }
  async request<T>(type: string): Promise<T> {
    this.calls.push(type);
    return {} as T;
  }
  close() {
    this.closed = true;
  }
  push(message: Record<string, unknown>) {
    this.options.onPush?.({ push: true, eventId: crypto.randomUUID(), ...message });
  }
  async reconnect() {
    this.options.onClose?.();
    await this.options.onOpen?.({ reconnect: true });
  }
}

function socketDeps() {
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

function snapshot(sessionCount = 1): DashboardSnapshot {
  return {
    machineStatus: "online",
    workspaces: [
      {
        id: WS,
        path: "/repo",
        userId: USER,
        daemonDesired: "off",
        daemonDesiredSource: null,
        createdAt: NOW,
        updatedAt: NOW,
        lastActiveAt: NOW,
        daemonStatus: "offline",
        connections: [],
        sessionCount,
      },
    ],
    recentSessions: [],
    sessionsToday: 0,
    generatedAt: NOW,
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

function setup(fetchSnapshot: (since: string) => Promise<DashboardSnapshot>) {
  const { deps, clients } = socketDeps();
  const store = new UserActivityStore({ fetchSnapshot });
  const socketRef = acquireSharedSocket({}, deps);
  const detach = store.attach(socketRef.socket);
  cleanups.push(() => {
    detach();
    socketRef.release();
  });
  return { store, clients, socket: socketRef.socket };
}

describe("UserActivityStore", () => {
  test("loads the snapshot once the socket is live, with local midnight as `since`", async () => {
    const sinces: string[] = [];
    const { store } = setup(async (since) => {
      sinces.push(since);
      return snapshot();
    });
    expect(store.getView().loaded).toBe(false);
    await flush();

    const view = store.getView();
    expect(view.loaded).toBe(true);
    expect(view.live).toBe("live");
    expect(view.workspaces[WS]?.sessionCount).toBe(1);
    expect(sinces).toHaveLength(1);
    const midnight = new Date(sinces[0]!);
    expect([midnight.getHours(), midnight.getMinutes(), midnight.getSeconds()]).toEqual([0, 0, 0]);
  });

  test("folds pushes into the view and notifies subscribers", async () => {
    const { store, clients } = setup(async () => snapshot());
    await flush();

    let notified = 0;
    store.subscribe(() => {
      notified += 1;
    });
    clients[0]!.push({
      type: "machine.presence",
      data: { machineId: "m", status: "offline" },
    });

    expect(store.getView().machineStatus).toBe("offline");
    expect(store.getView().activity[0]).toMatchObject({ kind: "machine", detail: "offline" });
    expect(notified).toBeGreaterThan(0);
  });

  test("ignores pushes it does not model", async () => {
    const { store, clients } = setup(async () => snapshot());
    await flush();
    const before = store.getView();
    clients[0]!.push({ type: "workspace.ping.dispatch", data: {} });
    expect(store.getView()).toBe(before);
  });

  test("re-fetches the snapshot after a reconnect and tracks the Sin sync badge", async () => {
    let counter = 0;
    const { store, clients } = setup(async () => snapshot(++counter));
    await flush();
    expect(store.getView().workspaces[WS]?.sessionCount).toBe(1);

    const lives: string[] = [];
    store.subscribe(() => lives.push(store.getView().live));
    await clients[0]!.reconnect();
    await flush();

    expect(lives).toContain("connecting");
    expect(store.getView().live).toBe("live");
    expect(store.getView().workspaces[WS]?.sessionCount).toBe(2);
  });

  test("a failing snapshot keeps the error and recovers on the next refresh", async () => {
    let fail = true;
    const { store } = setup(async () => {
      if (fail) throw new Error("API caída");
      return snapshot();
    });
    await flush();
    expect(store.getView()).toMatchObject({ loaded: false, error: "API caída" });

    fail = false;
    await store.refresh();
    expect(store.getView()).toMatchObject({ loaded: true, error: null });
  });

  test("a push during a refresh triggers one more fetch", async () => {
    let calls = 0;
    let release: (() => void) | null = null;
    const { store, clients } = setup(async () => {
      calls += 1;
      if (calls === 1) await new Promise<void>((resolve) => (release = resolve));
      return snapshot(calls);
    });
    await flush();
    expect(calls).toBe(1);

    clients[0]!.push({ type: "machine.presence", data: { machineId: "m", status: "offline" } });
    release!();
    await flush();
    await flush();

    expect(calls).toBe(2);
    expect(store.getView().workspaces[WS]?.sessionCount).toBe(2);
  });

  test("markIdle ends a generation the page finished itself", async () => {
    const { store, clients } = setup(async () => snapshot());
    await flush();
    clients[0]!.push({
      type: "chat.generate.progress",
      data: {
        requestId: "r",
        workspaceId: WS,
        sessionId: "22222222-2222-4222-8222-222222222222",
        phase: "streaming",
      },
    });
    expect(Object.keys(store.getView().generating)).toHaveLength(1);
    store.markIdle("22222222-2222-4222-8222-222222222222");
    expect(store.getView().generating).toEqual({});
  });

  test("detaching stops listening", async () => {
    const { store, clients } = setup(async () => snapshot());
    await flush();
    cleanups.pop()!();
    clients[0]!.push({ type: "machine.presence", data: { machineId: "m", status: "offline" } });
    expect(store.getView().machineStatus).toBe("online");
  });
});

describe("acquireUserActivity", () => {
  test("is a ref-counted page singleton that owns the user-level socket", async () => {
    const { deps, clients } = socketDeps();
    const storeDeps = { fetchSnapshot: async () => snapshot() };
    const a = acquireUserActivity({ socket: deps, store: storeDeps });
    const b = acquireUserActivity({ socket: deps, store: storeDeps });
    await flush();

    expect(a.store).toBe(b.store);
    expect(clients).toHaveLength(1);
    expect(clients[0]!.calls).toEqual(["user.subscribe"]);
    expect(a.store.getView().loaded).toBe(true);

    a.release();
    a.release();
    expect(clients[0]!.closed).toBe(false);
    b.release();
    expect(clients[0]!.closed).toBe(true);
    expect(sharedSocketCount()).toBe(0);

    const c = acquireUserActivity({ socket: deps, store: storeDeps });
    expect(c.store).not.toBe(a.store);
    c.release();
  });

  test("shares the page socket with a workspace consumer", async () => {
    const { deps, clients } = socketDeps();
    const activity = acquireUserActivity({
      socket: deps,
      store: { fetchSnapshot: async () => snapshot() },
    });
    const ws = acquireSharedSocket({ workspaceId: WS, path: "/repo" }, deps);
    await flush();

    expect(clients).toHaveLength(1);
    expect(clients[0]!.calls).toEqual(["user.subscribe", "workspace.bind", "workspace.sync"]);
    ws.release();
    activity.release();
    expect(sharedSocketCount()).toBe(0);
  });
});
