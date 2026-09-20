import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";

export const ws = new Hono();

ws.get(
  "/ws",
  upgradeWebSocket(() => ({
    onMessage(event, socket) {
      if (typeof event.data !== "string") return;
      socket.send(event.data);
    },
    onError(_event, socket) {
      socket.close();
    },
  })),
);
