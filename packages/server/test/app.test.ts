import { describe, expect, test } from "bun:test";
import server from "../src/index.ts";
import { createApp } from "../src/app.ts";

describe("server", () => {
  test("GET /health returns ok", async () => {
    const response = await createApp().request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  test("websocket echoes text", async () => {
    const running = Bun.serve({
      fetch: server.fetch,
      websocket: server.websocket,
      port: 0,
    });

    const socket = new WebSocket(`ws://127.0.0.1:${running.port}/ws`);

    try {
      await new Promise<void>((resolve, reject) => {
        socket.addEventListener("open", () => resolve(), { once: true });
        socket.addEventListener("error", () => reject(new Error("websocket failed to open")), {
          once: true,
        });
      });

      const echoed = new Promise<string>((resolve, reject) => {
        socket.addEventListener(
          "message",
          (event) => {
            resolve(String(event.data));
          },
          { once: true },
        );
        socket.addEventListener("error", () => reject(new Error("websocket error")), { once: true });
      });

      socket.send("hola");
      expect(await echoed).toBe("hola");
    } finally {
      socket.close();
      running.stop(true);
    }
  });
});
