import { z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";

const SignUpBodySchema = z
  .object({
    name: z.string().min(1).openapi({ example: "Ada Lovelace" }),
    email: z.string().email().openapi({ example: "ada@example.com" }),
    password: z.string().min(8).openapi({ example: "password123" }),
  })
  .openapi("SignUpEmailBody");

const SignInBodySchema = z
  .object({
    email: z.string().email().openapi({ example: "ada@example.com" }),
    password: z.string().min(8).openapi({ example: "password123" }),
  })
  .openapi("SignInEmailBody");

const UserSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    emailVerified: z.boolean(),
    image: z.string().nullable().optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  })
  .openapi("AuthUser");

const SessionSchema = z
  .object({
    id: z.string(),
    token: z.string().optional(),
    expiresAt: z.string().datetime().optional(),
    userId: z.string().uuid().optional(),
  })
  .openapi("AuthSession");

const AuthTokenResponseSchema = z
  .object({
    token: z.string().nullable().optional(),
    user: UserSchema,
  })
  .openapi("AuthTokenResponse");

const SessionResponseSchema = z
  .object({
    session: SessionSchema.nullable(),
    user: UserSchema.nullable(),
  })
  .openapi("SessionResponse");

/** Documentation-only paths for better-auth email/password (handler remains catch-all). */
export function registerAuthOpenApiPaths(app: OpenAPIHono) {
  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Session token from sign-in / sign-up (Bearer plugin)",
  });

  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/api/auth/sign-up/email",
    tags: ["Auth"],
    summary: "Sign up with email and password",
    request: {
      body: {
        required: true,
        content: {
          "application/json": {
            schema: SignUpBodySchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "User created",
        content: {
          "application/json": {
            schema: AuthTokenResponseSchema,
          },
        },
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/api/auth/sign-in/email",
    tags: ["Auth"],
    summary: "Sign in with email and password",
    request: {
      body: {
        required: true,
        content: {
          "application/json": {
            schema: SignInBodySchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Signed in",
        content: {
          "application/json": {
            schema: AuthTokenResponseSchema,
          },
        },
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/api/auth/sign-out",
    tags: ["Auth"],
    summary: "Sign out current session",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Signed out",
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/auth/get-session",
    tags: ["Auth"],
    summary: "Get current session",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Current session or null",
        content: {
          "application/json": {
            schema: SessionResponseSchema,
          },
        },
      },
    },
  });
}

export function registerWsOpenApiPath(app: OpenAPIHono) {
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/ws",
    tags: ["Realtime"],
    summary: "WebSocket upgrade",
    description: [
      "Upgrade to WebSocket. Requires a valid session (cookie, `?token=`, or Bearer). Returns 401 without auth.",
      "Not usable from Swagger UI — use a WS client.",
      "",
      "**Client kinds:** `host` (machine presence + daemon dispatch), `daemon` (workspace primary/standby), `client` (TUI/web).",
      "",
      "**Incoming `type` values** (client → server; see `packages/shared/src/ws/protocol.ts`):",
      "`workspace.bind`, `host.bind`, `daemon.heartbeat`, `workspace.ping`, `workspace.ping.result`,",
      "`daemon.start.result`, `daemon.stop.result`, `workspace.daemon.set`, `workspace.sync`,",
      "`session.list`, `session.open`, `session.create`, `session.delete`, `chat.send`,",
      "`chat.generate.result`, `chat.generate.progress` (optional `toolCall` / `textDelta`).",
      "",
      "**Push events** (server → client):",
      "`machine.presence`, `daemon.start.dispatch`, `daemon.stop.dispatch`, `daemon.presence`,",
      "`workspace.ping.dispatch`, `connection.status`, `session.updated`, `session.message.created`,",
      "`session.deleted`, `chat.generate.dispatch`, `chat.generate.progress` (push; may include `toolCall`).",
      "",
      "`chat.generate.result.data.parts` may include `tool-call` and `text` parts for history replay.",
      "",
      "Source of truth for message shapes: `packages/shared/src/ws/protocol.ts`.",
    ].join("\n"),
    responses: {
      101: {
        description: "Switching Protocols (WebSocket)",
      },
      401: {
        description: "Unauthorized",
      },
    },
  });
}
