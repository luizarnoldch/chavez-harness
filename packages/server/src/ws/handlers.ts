import {
  NO_DAEMON_ERROR,
  incomingWsMessageSchema,
  type DaemonPresencePush,
  type WsReply,
  type WorkspacePingResult,
} from "@chavez-harness/shared";
import { assignClientRole, assignDaemonRole } from "./bind-role.ts";
import type { Hub, HubConnection } from "./hub.ts";
import type { HeartbeatSweeper } from "./heartbeat.ts";
import type { PendingRegistry } from "./pending.ts";

function reply(type: string, id: string, ok: boolean, data?: unknown, error?: string): WsReply {
  return { type, id, ok, data, error };
}

function workspaceIdForPath(userId: string, path: string): string {
  return `${userId}:${path}`;
}

export type HandlerDeps = {
  hub: Hub;
  pending: PendingRegistry;
  heartbeat: HeartbeatSweeper;
};

export async function handleWsMessage(
  conn: HubConnection,
  raw: string,
  deps: HandlerDeps,
): Promise<void> {
  const { hub, pending, heartbeat } = deps;

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

  switch (msg.type) {
    case "workspace.bind": {
      const workspaceId = workspaceIdForPath(conn.userId, msg.path);
      hub.update(conn.connectionId, {
        workspaceId,
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
            workspaceId,
            path: msg.path,
            clientKind: "daemon",
            role,
          }),
        );
        heartbeat.emitPresence(conn.userId, {
          workspaceId,
          status: "online",
          connectionId: conn.connectionId,
          role,
        });
      } else {
        assignClientRole(hub, conn.connectionId);
        hub.sendTo(
          conn.connectionId,
          reply("workspace.bind", msg.id, true, {
            workspaceId,
            path: msg.path,
            clientKind: "client",
          }),
        );
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
          reply("workspace.ping", msg.id, false, undefined, NO_DAEMON_ERROR),
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
  }
}

export function onConnectionClosed(
  conn: HubConnection,
  deps: HandlerDeps,
): void {
  const { hub, heartbeat } = deps;
  const removed = hub.unregister(conn.connectionId);
  if (!removed || removed.clientKind !== "daemon" || !removed.workspaceId) return;

  const presence: DaemonPresencePush["data"] = {
    workspaceId: removed.workspaceId,
    status: "offline",
    connectionId: removed.connectionId,
    role: removed.role ?? undefined,
  };
  heartbeat.emitPresence(removed.userId, presence);

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
    }
  }
}
