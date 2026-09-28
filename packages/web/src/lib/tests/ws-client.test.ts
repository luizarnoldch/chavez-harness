import { afterEach, beforeEach, describe, expect, test } from "bun:test";

type Listener = (...args: unknown[]) => void;

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  readonly url: string;
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    queueMicrotask(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN;
        this.emit("open");
      }
    });
  }

  addEventListener(type: string, fn: Listener) {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(fn);
  }

  removeEventListener(type: string, fn: Listener) {
    this.listeners.get(type)?.delete(fn);
  }

  send(_data: string) {}

  close() {
    if (this.readyState === MockWebSocket.CLOSED) return;
    this.readyState = MockWebSocket.CLOSED;
    this.emit("close");
  }

  emit(type: string, ...args: unknown[]) {
    for (const fn of this.listeners.get(type) ?? []) {
      fn(...args);
    }
  }
}

describe("ChavezWsClient reconnect", () => {
  const OriginalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    // @ts-expect-error mock WebSocket for unit tests
    globalThis.WebSocket = MockWebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = OriginalWebSocket;
  });

  test("open → close → reopen llama onOpen con reconnect true y onClose", async () => {
    const { ChavezWsClient } = await import("../ws-client");

    const opens: Array<{ reconnect: boolean }> = [];
    let closeCount = 0;

    const client = new ChavezWsClient({
      autoReconnect: true,
      onOpen: (info) => {
        opens.push(info);
      },
      onClose: () => {
        closeCount += 1;
      },
    });

    await client.connect();
    expect(opens).toEqual([{ reconnect: false }]);
    expect(MockWebSocket.instances).toHaveLength(1);

    const first = MockWebSocket.instances[0]!;
    first.close();
    expect(closeCount).toBe(1);

    await new Promise<void>((resolve, reject) => {
      const deadline = Date.now() + 2500;
      const tick = () => {
        if (opens.length >= 2) {
          resolve();
          return;
        }
        if (Date.now() > deadline) {
          reject(new Error("timeout waiting for reconnect onOpen"));
          return;
        }
        setTimeout(tick, 50);
      };
      tick();
    });

    expect(opens[1]).toEqual({ reconnect: true });
    expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(2);

    client.close();
  });
});
