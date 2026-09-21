import {
  NO_DAEMON_ERROR,
  NO_HOST_ERROR,
  incomingWsMessageSchema,
  type ChatGenerateResult,
  type DaemonPresencePush,
  type DaemonStartResult,
  type DaemonStopResult,
  type WsReply,
  type WorkspacePingResult,
} from "@chavez-harness/shared";
import type { ChatService, WorkspaceService } from "../services/chat.ts";
import { ChatNotFoundError } from "../services/chat.ts";
import { resolveProviderReply } from "../services/resolve-provider-reply.ts";
import type { ProviderCredentialsService } from "../services/providers.ts";
import type { ProviderJobStore } from "../services/provider-jobs.ts";
import { assignClientRole, assignDaemonRole, assignHostRole } from "./bind-role.ts";
import { applyDaemonDesired, reconcileDesiredDaemons } from "./daemon-desired.ts";
import type { Hub, HubConnection } from "./hub.ts";
import type { HeartbeatSweeper } from "./heartbeat.ts";
import type { PendingRegistry } from "./pending.ts";

function noDaemonOrHostError(hub: Hub, userId: string): string {
  return hub.findHost(userId) ? NO_DAEMON_ERROR : NO_HOST_ERROR;
}

function reply(type: string, id: string, ok: boolean, data?: unknown, error?: string): WsReply {
  return { type, id, ok, data, error };
}

function daemonStatusFor(
  hub: Hub,
  userId: string,
  workspaceId: string,
): "online" | "offline" | "stale" {
  const daemon = hub.findDaemon(userId, workspaceId);
  return daemon ? "online" : "offline";
}

function connectionsFor(
  hub: Hub,
  userId: string,
  workspaceId: string,
): Array<{
  connectionId: string;
  clientKind: HubConnection["clientKind"];
  role: HubConnection["role"];
}> {
  return hub.listForWorkspace(userId, workspaceId).map((c) => ({
    connectionId: c.connectionId,
    clientKind: c.clientKind,
    role: c.role,
  }));
}

function emitConnectionStatus(
  hub: Hub,
  userId: string,
  workspaceId: string,
  path: string,
  exceptConnectionId?: string,
) {
  hub.broadcastToWorkspace(
    userId,
    workspaceId,
    {
      push: true,
      eventId: crypto.randomUUID(),
      type: "connection.status",
      data: {
        linked: true,
        workspaceId,
        path,
        daemon: daemonStatusFor(hub, userId, workspaceId),
        connections: connectionsFor(hub, userId, workspaceId),
      },
    },
    exceptConnectionId,
  );
}

function emitMachinePresence(
  hub: Hub,
  userId: string,
  data: {
    machineId: string;
    hostname?: string | null;
    status: "online" | "offline";
  },
  exceptConnectionId?: string,
) {
  hub.broadcastToUser(
    userId,
    {
      push: true,
      eventId: crypto.randomUUID(),
      type: "machine.presence",
      data: {
        machineId: data.machineId,
        hostname: data.hostname ?? null,
        status: data.status,
      },
    },
    exceptConnectionId,
  );
}

function emitMessages(
  hub: Hub,
  userId: string,
  workspaceId: string,
  session: unknown,
  messages: unknown[],
  exceptConnectionId?: string,
) {
  for (const message of messages) {
    hub.broadcastToWorkspace(
      userId,
      workspaceId,
      {
        push: true,
        eventId: crypto.randomUUID(),
        type: "session.message.created",
        data: { workspaceId, session, message },
      },
      exceptConnectionId,
    );
  }
}

export type HandlerDeps = {
  hub: Hub;
  pending: PendingRegistry;
  heartbeat: HeartbeatSweeper;
  workspaces: WorkspaceService;
  chat: ChatService;
  providers: ProviderCredentialsService;
  jobs: ProviderJobStore;
};

export async function handleWsMessage(
  conn: HubConnection,
  raw: string,
  deps: HandlerDeps,
): Promise<void> {
  const { hub, pending, heartbeat, workspaces, chat, providers, jobs } = deps;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    hub.sendTo(conn.connectionId, reply("error", "unknown", false, undefined, "Invalid JSON"));
    return;
  }

  const result = incomingWsMessageSchema.safeParse(parsed);
  if (!result.success) {
    const id =
      typeof parsed === "object" &&
      parsed != null &&
      "id" in parsed &&
      typeof (parsed as { id: unknown }).id === "string"
        ? (parsed as { id: string }).id
        : "unknown";
    const type =
      typeof parsed === "object" &&
      parsed != null &&
      "type" in parsed &&
      typeof (parsed as { type: unknown }).type === "string"
        ? (parsed as { type: string }).type
        : "error";
    hub.sendTo(
      conn.connectionId,
      reply(type, id, false, undefined, result.error.issues[0]?.message ?? "Invalid message"),
    );
    return;
  }

  const msg = result.data;

  try {
    switch (msg.type) {
      case "host.bind": {
        assignHostRole(hub, conn.connectionId, msg.machineId, msg.hostname ?? null);
        hub.sendTo(
          conn.connectionId,
          reply("host.bind", msg.id, true, {
            machineId: msg.machineId,
            hostname: msg.hostname ?? null,
            status: "online" as const,
          }),
        );
        emitMachinePresence(hub, conn.userId, {
          machineId: msg.machineId,
          hostname: msg.hostname ?? null,
          status: "online",
        });
        void reconcileDesiredDaemons({
          hub,
          pending,
          workspaces,
          userId: conn.userId,
        });
        return;
      }

      case "workspace.bind": {
        const ws = await workspaces.upsertByPath(conn.userId, msg.path);
        hub.update(conn.connectionId, {
          workspaceId: ws.id,
          workspacePath: msg.path,
        });

        if (msg.clientKind === "daemon") {
          const daemonId = msg.daemonId ?? crypto.randomUUID();
          const refreshed = hub.get(conn.connectionId);
          if (!refreshed) return;
          const { role } = assignDaemonRole(hub, refreshed, daemonId);
          hub.sendTo(
            conn.connectionId,
            reply("workspace.bind", msg.id, true, {
              workspaceId: ws.id,
              path: msg.path,
              clientKind: "daemon",
              role,
            }),
          );
          heartbeat.emitPresence(conn.userId, {
            workspaceId: ws.id,
            status: "online",
            connectionId: conn.connectionId,
            role,
          });
          emitConnectionStatus(hub, conn.userId, ws.id, msg.path);
        } else {
          assignClientRole(hub, conn.connectionId);
          hub.sendTo(
            conn.connectionId,
            reply("workspace.bind", msg.id, true, {
              workspaceId: ws.id,
              path: msg.path,
              clientKind: "client",
            }),
          );
          emitConnectionStatus(hub, conn.userId, ws.id, msg.path);
        }
        return;
      }

      case "daemon.heartbeat": {
        if (conn.clientKind !== "daemon" || conn.workspaceId !== msg.workspaceId) {
          hub.sendTo(
            conn.connectionId,
            reply("daemon.heartbeat", msg.id, false, undefined, "Not bound as daemon for workspace"),
          );
          return;
        }
        hub.update(conn.connectionId, { lastHeartbeatAt: Date.now() });
        hub.sendTo(conn.connectionId, reply("daemon.heartbeat", msg.id, true, { ok: true }));
        return;
      }

      case "workspace.daemon.set": {
        const outcome = await applyDaemonDesired({
          hub,
          pending,
          workspaces,
          userId: conn.userId,
          workspaceId: msg.workspaceId,
          desired: msg.desired,
          source: msg.source,
        });
        emitConnectionStatus(hub, conn.userId, outcome.workspace.id, outcome.workspace.path);
        hub.sendTo(
          conn.connectionId,
          reply("workspace.daemon.set", msg.id, true, {
            workspaceId: outcome.workspace.id,
            daemonDesired: outcome.workspace.daemonDesired,
            daemonDesiredSource: outcome.workspace.daemonDesiredSource,
            daemonStatus: outcome.daemonStatus,
            ignored: outcome.ignored,
          }),
        );
        return;
      }

      case "daemon.start.result": {
        pending.complete(msg.requestId, msg as DaemonStartResult);
        return;
      }

      case "daemon.stop.result": {
        pending.complete(msg.requestId, msg as DaemonStopResult);
        return;
      }

      case "workspace.ping": {
        if (!conn.workspaceId || conn.workspaceId !== msg.workspaceId) {
          hub.sendTo(
            conn.connectionId,
            reply("workspace.ping", msg.id, false, undefined, "Bind to workspace first"),
          );
          return;
        }
        const daemon = hub.findDaemon(conn.userId, msg.workspaceId);
        if (!daemon || !daemon.workspacePath) {
          hub.sendTo(
            conn.connectionId,
            reply(
              "workspace.ping",
              msg.id,
              false,
              undefined,
              noDaemonOrHostError(hub, conn.userId),
            ),
          );
          return;
        }

        const waitPromise = pending.wait<WorkspacePingResult>(msg.id);
        hub.sendTo(daemon.connectionId, {
          type: "workspace.ping.dispatch",
          push: true,
          eventId: crypto.randomUUID(),
          requestId: msg.id,
          workspaceId: msg.workspaceId,
          path: daemon.workspacePath,
        });

        try {
          const daemonResult = await waitPromise;
          if (!daemonResult.ok) {
            hub.sendTo(
              conn.connectionId,
              reply(
                "workspace.ping",
                msg.id,
                false,
                undefined,
                daemonResult.error ?? "Daemon ping failed",
              ),
            );
            return;
          }
          hub.sendTo(
            conn.connectionId,
            reply("workspace.ping", msg.id, true, daemonResult.data),
          );
        } catch (err) {
          hub.sendTo(
            conn.connectionId,
            reply(
              "workspace.ping",
              msg.id,
              false,
              undefined,
              err instanceof Error ? err.message : "Ping failed",
            ),
          );
        }
        return;
      }

      case "workspace.ping.result": {
        pending.complete(msg.requestId, msg);
        return;
      }

      case "chat.generate.result": {
        pending.complete(msg.requestId, msg as ChatGenerateResult);
        return;
      }

      case "chat.generate.progress": {
        hub.broadcastToWorkspace(conn.userId, msg.workspaceId, {
          push: true,
          eventId: crypto.randomUUID(),
          type: "chat.generate.progress",
          data: {
            requestId: msg.requestId,
            workspaceId: msg.workspaceId,
            sessionId: msg.sessionId,
            phase: msg.phase,
            ...(msg.textDelta != null ? { textDelta: msg.textDelta } : {}),
            ...(msg.toolCall != null ? { toolCall: msg.toolCall } : {}),
          },
        });
        return;
      }

      case "workspace.sync": {
        const ws = await workspaces.getForUser(conn.userId, msg.workspaceId);
        if (!ws) {
          hub.sendTo(
            conn.connectionId,
            reply("workspace.sync", msg.id, false, undefined, "Workspace no encontrado"),
          );
          return;
        }
        hub.sendTo(
          conn.connectionId,
          reply("workspace.sync", msg.id, true, {
            workspace: ws,
            daemonStatus: daemonStatusFor(hub, conn.userId, ws.id),
            machineStatus: hub.machineStatus(conn.userId),
            chatSessionId: msg.chatSessionId ?? null,
            connections: connectionsFor(hub, conn.userId, ws.id),
          }),
        );
        return;
      }

      case "session.list": {
        const sessions = await chat.listSessions(conn.userId, msg.workspaceId);
        hub.sendTo(conn.connectionId, reply("session.list", msg.id, true, { sessions }));
        return;
      }

      case "session.open": {
        const data = msg.chatSessionId
          ? await chat.getSessionWithMessages(conn.userId, msg.chatSessionId, msg.afterSeq)
          : await chat.getLatestOrCreate(conn.userId, msg.workspaceId);
        hub.sendTo(conn.connectionId, reply("session.open", msg.id, true, data));
        return;
      }

      case "session.create": {
        const created = await chat.createSession(conn.userId, msg.workspaceId, {
          title: msg.title,
          mode: msg.mode,
          provider: msg.provider,
          model: msg.model,
        });
        hub.broadcastToWorkspace(conn.userId, msg.workspaceId, {
          push: true,
          eventId: crypto.randomUUID(),
          type: "session.updated",
          data: created,
        });
        hub.sendTo(conn.connectionId, reply("session.create", msg.id, true, created));
        return;
      }

      case "chat.send": {
        const sendResult = await chat.sendMessage({
          chatSessionId: msg.chatSessionId,
          userId: conn.userId,
          text: msg.text,
          mode: msg.mode,
          provider: msg.provider,
          model: msg.model,
          clientMessageId: msg.clientMessageId,
          onUserMessagePersisted: async ({ session, userMessage, workspaceId }) => {
            emitMessages(
              hub,
              conn.userId,
              workspaceId,
              session,
              [userMessage],
              conn.connectionId,
            );
          },
          generateReply: async (ctx) =>
            resolveProviderReply(
              {
                provider: ctx.provider,
                model: ctx.model,
                text: ctx.text,
                workspaceId: ctx.workspaceId,
                workspacePath: ctx.workspacePath,
                userId: conn.userId,
                sessionId: msg.chatSessionId,
                mode: msg.mode,
                agentId: ctx.cursorAgentId,
                onAgentId: (agentId) => chat.setCursorAgentId(msg.chatSessionId, agentId),
              },
              { hub, pending, jobs, providers },
            ),
        });

        if (sendResult.created) {
          emitMessages(
            hub,
            conn.userId,
            sendResult.session.workspaceId,
            sendResult.session,
            [sendResult.assistantMessage],
            conn.connectionId,
          );
          hub.broadcastToWorkspace(
            conn.userId,
            sendResult.session.workspaceId,
            {
              push: true,
              eventId: crypto.randomUUID(),
              type: "session.updated",
              data: sendResult.session,
            },
            conn.connectionId,
          );
        }

        hub.sendTo(conn.connectionId, reply("chat.send", msg.id, true, sendResult));
        return;
      }

      case "session.delete": {
        const deleted = await chat.deleteSession(conn.userId, msg.chatSessionId);
        hub.broadcastToWorkspace(conn.userId, deleted.workspaceId, {
          push: true,
          eventId: crypto.randomUUID(),
          type: "session.deleted",
          data: {
            workspaceId: deleted.workspaceId,
            chatSessionId: deleted.sessionId,
          },
        });
        hub.sendTo(
          conn.connectionId,
          reply("session.delete", msg.id, true, {
            workspaceId: deleted.workspaceId,
            chatSessionId: deleted.sessionId,
          }),
        );
        return;
      }
    }
  } catch (err) {
    const type = "type" in msg ? msg.type : "error";
    const id = "id" in msg && typeof msg.id === "string" ? msg.id : "unknown";
    const message =
      err instanceof ChatNotFoundError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Internal error";
    hub.sendTo(conn.connectionId, reply(type, id, false, undefined, message));
  }
}

export function onConnectionClosed(conn: HubConnection, deps: HandlerDeps): void {
  const { hub, heartbeat } = deps;
  const removed = hub.unregister(conn.connectionId);
  if (!removed) return;

  if (removed.clientKind === "host") {
    emitMachinePresence(hub, removed.userId, {
      machineId: removed.machineId ?? "unknown",
      hostname: removed.hostname,
      status: "offline",
    });
    return;
  }

  if (!removed.workspaceId) return;

  if (removed.clientKind === "client" && removed.workspacePath) {
    emitConnectionStatus(hub, removed.userId, removed.workspaceId, removed.workspacePath);
    return;
  }

  if (removed.clientKind !== "daemon") return;

  const presence: DaemonPresencePush["data"] = {
    workspaceId: removed.workspaceId,
    status: "offline",
    connectionId: removed.connectionId,
    role: removed.role ?? undefined,
  };
  heartbeat.emitPresence(removed.userId, presence);

  if (removed.workspacePath) {
    emitConnectionStatus(hub, removed.userId, removed.workspaceId, removed.workspacePath);
  }

  if (removed.role === "primary") {
    const next = hub.listDaemons(removed.userId, removed.workspaceId)[0];
    if (next) {
      hub.update(next.connectionId, { role: "primary" });
      heartbeat.emitPresence(removed.userId, {
        workspaceId: removed.workspaceId,
        status: "online",
        connectionId: next.connectionId,
        role: "primary",
      });
      if (removed.workspacePath) {
        emitConnectionStatus(hub, removed.userId, removed.workspaceId, removed.workspacePath);
      }
    }
  }
}
