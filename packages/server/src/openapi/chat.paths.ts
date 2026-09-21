import type { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  BindWorkspaceBodySchema,
  ChatSessionSchema,
  ChatSessionWithMessagesSchema,
  CreateSessionBodySchema,
  DaemonControlBodySchema,
  DaemonControlResponseSchema,
  DeleteSessionResponseSchema,
  ErrorBodySchema,
  MachineStatusSchema,
  SendMessageBodySchema,
  SendMessageResponseSchema,
  SessionIdParam,
  SessionListSchema,
  WorkspaceConnectionsSchema,
  WorkspaceIdParam,
  WorkspaceListSchema,
  WorkspaceSchema,
} from "./schemas.ts";

const workspaceIdParams = z.object({ workspaceId: WorkspaceIdParam });
const sessionIdParams = z.object({ sessionId: SessionIdParam });

const unauthorized = {
  401: {
    description: "Unauthorized",
    content: { "application/json": { schema: ErrorBodySchema } },
  },
} as const;

const notFound = {
  404: {
    description: "Not found",
    content: { "application/json": { schema: ErrorBodySchema } },
  },
} as const;

/** Documentation-only paths for machine/workspace/chat REST (handlers in routes/api.ts). */
export function registerChatOpenApiPaths(app: OpenAPIHono) {
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/machine",
    tags: ["Machine"],
    summary: "Host machine presence",
    description:
      "Returns whether the user's Host process is connected over WebSocket, plus machineId/hostname when online.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Machine presence",
        content: { "application/json": { schema: MachineStatusSchema } },
      },
      ...unauthorized,
    },
  });

  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/api/workspaces/bind",
    tags: ["Workspaces"],
    summary: "Upsert workspace by absolute path",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: {
          "application/json": { schema: BindWorkspaceBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: "Workspace",
        content: { "application/json": { schema: WorkspaceSchema } },
      },
      400: {
        description: "Validation error",
        content: { "application/json": { schema: ErrorBodySchema } },
      },
      ...unauthorized,
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/workspaces",
    tags: ["Workspaces"],
    summary: "List workspaces",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Workspace list",
        content: { "application/json": { schema: WorkspaceListSchema } },
      },
      ...unauthorized,
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/workspaces/{workspaceId}",
    tags: ["Workspaces"],
    summary: "Get workspace",
    security: [{ bearerAuth: [] }],
    request: { params: workspaceIdParams },
    responses: {
      200: {
        description: "Workspace",
        content: { "application/json": { schema: WorkspaceSchema } },
      },
      ...unauthorized,
      ...notFound,
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/workspaces/{workspaceId}/connections",
    tags: ["Workspaces"],
    summary: "Workspace connection and daemon status",
    description:
      "Lists active WS connections for the workspace, daemon online/offline, desired daemon state, and Host machine status.",
    security: [{ bearerAuth: [] }],
    request: { params: workspaceIdParams },
    responses: {
      200: {
        description: "Connections snapshot",
        content: { "application/json": { schema: WorkspaceConnectionsSchema } },
      },
      ...unauthorized,
      ...notFound,
    },
  });

  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/api/workspaces/{workspaceId}/daemon",
    tags: ["Workspaces"],
    summary: "Set desired daemon state",
    description:
      "Persists daemonDesired and asks the Host to start/stop the workspace daemon. Requires Hub + Host online.",
    security: [{ bearerAuth: [] }],
    request: {
      params: workspaceIdParams,
      body: {
        required: true,
        content: {
          "application/json": { schema: DaemonControlBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: "Daemon control outcome",
        content: { "application/json": { schema: DaemonControlResponseSchema } },
      },
      400: {
        description: "Validation error",
        content: { "application/json": { schema: ErrorBodySchema } },
      },
      ...unauthorized,
      ...notFound,
      409: {
        description: "Host offline or conflict",
        content: { "application/json": { schema: ErrorBodySchema } },
      },
      503: {
        description: "WebSocket hub unavailable",
        content: { "application/json": { schema: ErrorBodySchema } },
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/workspaces/{workspaceId}/sessions",
    tags: ["Sessions"],
    summary: "List chat sessions",
    security: [{ bearerAuth: [] }],
    request: { params: workspaceIdParams },
    responses: {
      200: {
        description: "Sessions",
        content: { "application/json": { schema: SessionListSchema } },
      },
      ...unauthorized,
      ...notFound,
    },
  });

  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/api/workspaces/{workspaceId}/sessions",
    tags: ["Sessions"],
    summary: "Create chat session",
    security: [{ bearerAuth: [] }],
    request: {
      params: workspaceIdParams,
      body: {
        required: false,
        content: {
          "application/json": { schema: CreateSessionBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: "Session created",
        content: { "application/json": { schema: ChatSessionSchema } },
      },
      400: {
        description: "Validation error",
        content: { "application/json": { schema: ErrorBodySchema } },
      },
      ...unauthorized,
      ...notFound,
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/sessions/{sessionId}",
    tags: ["Sessions"],
    summary: "Get session with messages",
    security: [{ bearerAuth: [] }],
    request: {
      params: sessionIdParams,
      query: z.object({
        afterSeq: z.coerce
          .number()
          .int()
          .nonnegative()
          .optional()
          .openapi({
            param: { name: "afterSeq", in: "query" },
            description: "Only return messages with seq greater than this value",
          }),
      }),
    },
    responses: {
      200: {
        description: "Session + messages",
        content: {
          "application/json": { schema: ChatSessionWithMessagesSchema },
        },
      },
      ...unauthorized,
      ...notFound,
    },
  });

  app.openAPIRegistry.registerPath({
    method: "delete",
    path: "/api/sessions/{sessionId}",
    tags: ["Sessions"],
    summary: "Delete chat session",
    security: [{ bearerAuth: [] }],
    request: { params: sessionIdParams },
    responses: {
      200: {
        description: "Deleted",
        content: {
          "application/json": { schema: DeleteSessionResponseSchema },
        },
      },
      ...unauthorized,
      ...notFound,
    },
  });

  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/api/sessions/{sessionId}/messages",
    tags: ["Messages"],
    summary: "Send message",
    description:
      "Persists the user message and generates an assistant reply. Provider `local` uses a server-side echo; other providers (e.g. cursor) require Host + daemon and may unwrap credentials via provider jobs.",
    security: [{ bearerAuth: [] }],
    request: {
      params: sessionIdParams,
      body: {
        required: true,
        content: {
          "application/json": { schema: SendMessageBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: "User + assistant messages",
        content: {
          "application/json": { schema: SendMessageResponseSchema },
        },
      },
      400: {
        description: "Validation error",
        content: { "application/json": { schema: ErrorBodySchema } },
      },
      ...unauthorized,
      ...notFound,
    },
  });
}
