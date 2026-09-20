import { Hono } from "hono";
import { logger } from "hono/logger";
import { health } from "./routes/health.ts";
import { ws } from "./routes/ws.ts";

export function createApp() {
  const app = new Hono();
  app.use(logger());
  app.route("/", health);
  app.route("/", ws);
  return app;
}
