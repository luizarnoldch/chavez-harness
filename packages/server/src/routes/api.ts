import { chatModeSchema } from "@chavez-harness/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, type AuthVariables } from "../lib/auth/http.ts";
import { ChatNotFoundError, type ChatService, type WorkspaceService } from "../services/chat.ts";
import type { Hub } from "../ws/hub.ts";
import type { PendingRegistry } from "../ws/pending.ts";
import { applyDaemonDesired } from "../ws/daemon-desired.ts";
import type { ProviderCredentialsService } from "../services/providers.ts";
import type { ProviderJobStore } from "../services/provider-jobs.ts";
import { resolveProviderReply } from "../services/resolve-provider-reply.ts";

function emitMessagePushes(
  hub: Hub | undefined,
  userId: string,
  workspaceId: string,
  session: unknown,
  messages: unknown[],
) {
  if (!hub) return;
  for (const message of messages) {
    hub.broadcastToWorkspace(userId, workspaceId, {
      push: true,
      eventId: crypto.randomUUID(),
      type: "session.message.created",
      data: { workspaceId, session, message },
    });
  }
  hub.broadcastToWorkspace(userId, workspaceId, {
    push: true,
    eventId: crypto.randomUUID(),
    type: "session.updated",
    data: session,
  });
}

export type ApiRoutesOptions = {
  workspaces: WorkspaceService;
  chat: ChatService;
  hub?: Hub;
  pending?: PendingRegistry;
  providers?: ProviderCredentialsService;
  jobs?: ProviderJobStore;
};

export function createApiRoutes(options: ApiRoutesOptions) {
  const { workspaces, chat, hub, pending, providers, jobs } = options;
  const app = new Hono<{ Variables: AuthVariables }>();

  app.use("/api/*", requireAuth);

  app.get("/api/machine", async (c) => {
    const user = c.get("user");
    const host = hub?.findHost(user.id);
    if (!host) {
      return c.json({ status: "offline" as const, machineId: null, hostname: null });
    }
    return c.json({
      status: "online" as const,
      machineId: host.machineId,
      hostname: host.hostname,
    });
  });

  app.post(
    "/api/workspaces/bind",
    zValidator("json", z.object({ path: z.string().min(1) })),
    async (c) => {
      const { path } = c.req.valid("json");
      const user = c.get("user");
      const ws = await workspaces.upsertByPath(user.id, path);
      return c.json(ws);
    },
  );

  app.get("/api/workspaces", async (c) => {
    const user = c.get("user");
    const list = await workspaces.listForUser(user.id);
    return c.json({ workspaces: list });
  });

  app.get(
    "/api/workspaces/:workspaceId",
    zValidator("param", z.object({ workspaceId: z.string().uuid() })),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const user = c.get("user");
      const ws = await workspaces.getForUser(user.id, workspaceId);
      if (!ws) return c.json({ error: "Workspace no encontrado" }, 404);
      return c.json(ws);
    },
  );

  app.get(
    "/api/workspaces/:workspaceId/connections",
    zValidator("param", z.object({ workspaceId: z.string().uuid() })),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const user = c.get("user");
      const ws = await workspaces.getForUser(user.id, workspaceId);
      if (!ws) return c.json({ error: "Workspace no encontrado" }, 404);
      const list = hub?.listForWorkspace(user.id, workspaceId) ?? [];
      const daemon = list.some(
        (conn) => conn.clientKind === "daemon" && conn.role === "primary",
      )
        ? ("online" as const)
        : ("offline" as const);
      return c.json({
        daemon,
        daemonDesired: ws.daemonDesired,
        daemonDesiredSource: ws.daemonDesiredSource,
        machineStatus: hub?.machineStatus(user.id) ?? ("offline" as const),
        connections: list.map((conn) => ({
          connectionId: conn.connectionId,
          clientKind: conn.clientKind,
          role: conn.role,
        })),
      });
    },
  );

  app.post(
    "/api/workspaces/:workspaceId/daemon",
    zValidator("param", z.object({ workspaceId: z.string().uuid() })),
    zValidator(
      "json",
      z.object({
        desired: z.enum(["on", "off"]),
        source: z.enum(["tui", "web"]).default("web"),
      }),
    ),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      const ws = await workspaces.getForUser(user.id, workspaceId);
      if (!ws) return c.json({ error: "Workspace no encontrado" }, 404);

      if (!hub || !pending) {
        return c.json({ error: "Hub WS no disponible" }, 503);
      }

      try {
        const outcome = await applyDaemonDesired({
          hub,
          pending,
          workspaces,
          userId: user.id,
          workspaceId,
          desired: body.desired,
          source: body.source,
        });
        hub.broadcastToWorkspace(user.id, workspaceId, {
          push: true,
          eventId: crypto.randomUUID(),
          type: "connection.status",
          data: {
            linked: true,
            workspaceId,
            path: outcome.workspace.path,
            daemon: outcome.daemonStatus,
            connections: hub.listForWorkspace(user.id, workspaceId).map((conn) => ({
              connectionId: conn.connectionId,
              clientKind: conn.clientKind,
              role: conn.role,
            })),
          },
        });
        return c.json({
          workspace: outcome.workspace,
          daemonStatus: outcome.daemonStatus,
          ignored: outcome.ignored,
          machineStatus: hub.machineStatus(user.id),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al controlar daemon";
        const status = message.includes("Host") || message.includes("offline") ? 409 : 500;
        return c.json({ error: message }, status);
      }
    },
  );

  app.get(
    "/api/workspaces/:workspaceId/sessions",
    zValidator("param", z.object({ workspaceId: z.string().uuid() })),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const user = c.get("user");
      try {
        const sessions = await chat.listSessions(user.id, workspaceId);
        return c.json({ sessions });
      } catch (err) {
        if (err instanceof ChatNotFoundError) {
          return c.json({ error: err.message }, 404);
        }
        throw err;
      }
    },
  );

  app.post(
    "/api/workspaces/:workspaceId/sessions",
    zValidator("param", z.object({ workspaceId: z.string().uuid() })),
    zValidator(
      "json",
      z.object({
        title: z.string().optional(),
        mode: chatModeSchema.optional(),
        provider: z.string().min(1).optional(),
        model: z.string().min(1).optional(),
      }),
    ),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      try {
        const session = await chat.createSession(user.id, workspaceId, body);
        hub?.broadcastToWorkspace(user.id, workspaceId, {
          push: true,
          eventId: crypto.randomUUID(),
          type: "session.updated",
          data: session,
        });
        return c.json(session);
      } catch (err) {
        if (err instanceof ChatNotFoundError) {
          return c.json({ error: err.message }, 404);
        }
        throw err;
      }
    },
  );

  app.get(
    "/api/sessions/:sessionId",
    zValidator("param", z.object({ sessionId: z.string().uuid() })),
    zValidator(
      "query",
      z.object({
        afterSeq: z.coerce.number().int().nonnegative().optional(),
      }),
    ),
    async (c) => {
      const { sessionId } = c.req.valid("param");
      const { afterSeq } = c.req.valid("query");
      const user = c.get("user");
      try {
        const session = await chat.getSessionWithMessages(user.id, sessionId, afterSeq);
        return c.json(session);
      } catch (err) {
        if (err instanceof ChatNotFoundError) {
          return c.json({ error: err.message }, 404);
        }
        throw err;
      }
    },
  );

  app.delete(
    "/api/sessions/:sessionId",
    zValidator("param", z.object({ sessionId: z.string().uuid() })),
    async (c) => {
      const { sessionId } = c.req.valid("param");
      const user = c.get("user");
      try {
        const deleted = await chat.deleteSession(user.id, sessionId);
        hub?.broadcastToWorkspace(user.id, deleted.workspaceId, {
          push: true,
          eventId: crypto.randomUUID(),
          type: "session.deleted",
          data: {
            workspaceId: deleted.workspaceId,
            chatSessionId: deleted.sessionId,
          },
        });
        return c.json({
          workspaceId: deleted.workspaceId,
          chatSessionId: deleted.sessionId,
        });
      } catch (err) {
        if (err instanceof ChatNotFoundError) {
          return c.json({ error: err.message }, 404);
        }
        throw err;
      }
    },
  );

  app.post(
    "/api/sessions/:sessionId/messages",
    zValidator("param", z.object({ sessionId: z.string().uuid() })),
    zValidator(
      "json",
      z.object({
        text: z.string().min(1),
        mode: chatModeSchema,
        provider: z.string().min(1).optional(),
        model: z.string().min(1).optional(),
        clientMessageId: z.string().min(1).optional(),
      }),
    ),
    async (c) => {
      const { sessionId } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      try {
        const result = await chat.sendMessage({
          chatSessionId: sessionId,
          userId: user.id,
          text: body.text,
          mode: body.mode,
          provider: body.provider,
          model: body.model,
          clientMessageId: body.clientMessageId,
          onUserMessagePersisted: hub
            ? async ({ session, userMessage, workspaceId }) => {
                emitMessagePushes(hub, user.id, workspaceId, session, [userMessage]);
              }
            : undefined,
          generateReply:
            hub && pending && providers && jobs
              ? async (ctx) =>
                  resolveProviderReply(
                    {
                      provider: ctx.provider,
                      model: ctx.model,
                      text: ctx.text,
                      workspaceId: ctx.workspaceId,
                      workspacePath: ctx.workspacePath,
                      userId: user.id,
                      sessionId,
                      mode: body.mode,
                      agentId: ctx.cursorAgentId,
                      onAgentId: (agentId) => chat.setCursorAgentId(sessionId, agentId),
                    },
                    { hub, pending, jobs, providers },
                  )
              : undefined,
        });
        if (result.created) {
          emitMessagePushes(hub, user.id, result.session.workspaceId, result.session, [
            result.assistantMessage,
          ]);
        }
        return c.json(result);
      } catch (err) {
        if (err instanceof ChatNotFoundError) {
          return c.json({ error: err.message }, 404);
        }
        throw err;
      }
    },
  );

  return app;
}
