import { afterEach, describe, expect, test } from "bun:test";
import { ChavezWsClient } from "../ws/client.ts";

async function waitFor(check: () => boolean, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("timeout waiting for condition");
    await Bun.sleep(10);
  }
}

describe("ChavezWsClient onClose / onOpen", () => {
  const cleanup: Array<() => void> = [];
  afterEach(() => {
    while (cleanup.length) cleanup.pop()?.();
  });

  test("reports every socket close and reopens flagged as a reconnect", async () => {
    const sockets: Array<{ close: () => void }> = [];
    const server = Bun.serve({
      port: 0,
      fetch(req, srv) {
        return srv.upgrade(req) ? undefined : new Response("expected websocket", { status: 400 });
      },
      websocket: {
        open(ws) {
          sockets.push(ws);
        },
        message() {},
      },
    });
    cleanup.push(() => server.stop(true));

    const opens: boolean[] = [];
    let closes = 0;
    const client = new ChavezWsClient({
      apiUrl: `http://localhost:${server.port}`,
      token: "token",
      onOpen: ({ reconnect }) => {
        opens.push(reconnect);
      },
      onClose: () => {
        closes += 1;
      },
    });
    cleanup.push(() => client.close());

    await client.connect();
    expect(opens).toEqual([false]);
    expect(closes).toBe(0);

    sockets[0]!.close();
    await waitFor(() => closes === 1);
    await waitFor(() => opens.length === 2);
    expect(opens).toEqual([false, true]);

    client.close();
    await waitFor(() => closes === 2);
  });
});
