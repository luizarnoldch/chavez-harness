import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import config from "./lib/config.ts";
import db from "./lib/db.ts";
import {
  registerAuthOpenApiPaths,
  registerWsOpenApiPath,
} from "./openapi/auth.paths.ts";
import { registerChatOpenApiPaths } from "./openapi/chat.paths.ts";
import { createApiRoutes } from "./routes/api.ts";
import { createProviderRoutes } from "./routes/providers.ts";
import { authRoutes } from "./routes/auth.ts";
import { registerHealthRoutes } from "./routes/health.ts";
import { createWsRoute, type WsRouteOptions } from "./routes/ws.ts";
import {
  createChatService,
  createWorkspaceService,
  type ChatService,
  type WorkspaceService,
} from "./services/chat.ts";
import { createProviderCredentialsService } from "./services/providers.ts";
import { createProviderJobStore } from "./services/provider-jobs.ts";
import { createPendingRegistry } from "./ws/pending.ts";

export type CreateAppOptions = {
  ws?: WsRouteOptions;
  /** Force OpenAPI/Swagger routes (default: enabled when not production). */
  enableDocs?: boolean;
  workspaces?: WorkspaceService;
  chat?: ChatService;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = new OpenAPIHono();
  const workspaces = options.workspaces ?? createWorkspaceService(db);
  const chat = options.chat ?? createChatService(db);
  const providers =
    options.ws?.providers ??
    createProviderCredentialsService(db, config.credentialsEncryptionKey);
  const jobs = options.ws?.jobs ?? createProviderJobStore();
  const pending = options.ws?.pending ?? createPendingRegistry();
  const { route: wsRoute, hub } = createWsRoute({
    ...options.ws,
    workspaces: options.ws?.workspaces ?? workspaces,
    chat: options.ws?.chat ?? chat,
    providers,
    jobs,
    pending,
  });
  const enableDocs =
    options.enableDocs ?? config.nodeEnv !== "production";

  app.use(logger());
  app.use(
    "*",
    cors({
      origin: config.webUrl,
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: ["set-auth-token"],
    }),
  );
  app.route("/", authRoutes);
  registerHealthRoutes(app);
  app.route("/", createApiRoutes({ workspaces, chat, hub, pending, providers, jobs }));
  app.route("/", createProviderRoutes({ providers, jobs }));
  app.route("/", wsRoute);

  registerAuthOpenApiPaths(app);
  registerChatOpenApiPaths(app);
  registerWsOpenApiPath(app);

  if (enableDocs) {
    app.doc("/openapi.json", {
      openapi: "3.0.0",
      info: {
        title: "Chavez Harness API",
        version: "0.0.1",
        description:
          "HTTP API for Chavez Harness (health, better-auth, workspaces, chat, WebSocket upgrade).",
      },
      servers: [{ url: config.serverUrl }],
    });
    app.get("/docs", swaggerUI({ url: "/openapi.json" }));
  }

  return app;
}
