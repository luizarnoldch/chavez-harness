import { z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";

/** Documentation-only paths for workspace/chat REST (handlers in routes/api.ts). */
export function registerChatOpenApiPaths(app: OpenAPIHono) {
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
          "application/json": {
            schema: z.object({ path: z.string().min(1) }),
          },
        },
      },
    },
    responses: {
      200: { description: "Workspace" },
      401: { description: "Unauthorized" },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/workspaces",
    tags: ["Workspaces"],
    summary: "List workspaces",
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: "Workspace list" },
      401: { description: "Unauthorized" },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/workspaces/{workspaceId}",
    tags: ["Workspaces"],
    summary: "Get workspace",
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: "Workspace" },
      404: { description: "Not found" },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/workspaces/{workspaceId}/sessions",
    tags: ["Sessions"],
    summary: "List chat sessions",
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: "Sessions" },
      404: { description: "Not found" },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/api/workspaces/{workspaceId}/sessions",
    tags: ["Sessions"],
    summary: "Create chat session",
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: "Session created" },
      404: { description: "Not found" },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/sessions/{sessionId}",
    tags: ["Sessions"],
    summary: "Get session with messages",
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: "Session + messages" },
      404: { description: "Not found" },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/api/sessions/{sessionId}/messages",
    tags: ["Messages"],
    summary: "Send message (mock assistant reply)",
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: "User + assistant messages" },
      404: { description: "Not found" },
    },
  });
}
