import { websocket } from "hono/bun";
import { createApp } from "./app.ts";

const app = createApp();

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
  websocket,
};
