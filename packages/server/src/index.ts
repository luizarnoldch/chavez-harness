import { websocket } from "hono/bun";
import { createApp } from "./app.ts";
import config from "./lib/config.ts";

const app = createApp();

export default {
  port: config.port,
  fetch: app.fetch,
  websocket,
};
