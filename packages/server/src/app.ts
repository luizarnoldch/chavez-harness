import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { logger } from "hono/logger";
import config from "./lib/config.ts";
import {
  registerAuthOpenApiPaths,
  registerWsOpenApiPath,
} from "./openapi/auth.paths.ts";
import { authRoutes } from "./routes/auth.ts";
import { registerHealthRoutes } from "./routes/health.ts";
import { createWsRoute, type WsRouteOptions } from "./routes/ws.ts";

export type CreateAppOptions = {
  ws?: WsRouteOptions;
  /** Force OpenAPI/Swagger routes (default: enabled when not production). */
  enableDocs?: boolean;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = new OpenAPIHono();
  const { route: wsRoute } = createWsRoute(options.ws);
  const enableDocs =
    options.enableDocs ?? config.nodeEnv !== "production";

  app.use(logger());
  app.route("/", authRoutes);
  registerHealthRoutes(app);
  app.route("/", wsRoute);

  registerAuthOpenApiPaths(app);
  registerWsOpenApiPath(app);

  if (enableDocs) {
    app.doc("/openapi.json", {
      openapi: "3.0.0",
      info: {
        title: "Chavez Harness API",
        version: "0.0.1",
        description:
          "HTTP API for Chavez Harness (health, better-auth, WebSocket upgrade).",
      },
      servers: [{ url: config.serverUrl }],
    });
    app.get("/docs", swaggerUI({ url: "/openapi.json" }));
  }

  return app;
}
