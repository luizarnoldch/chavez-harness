import type {
  ChatMessageDto,
  ChatSessionDto,
  DaemonDesired,
  PushOrigin,
  SessionChange,
  SessionSettingKey,
  WorkspaceConnection,
  WorkspaceDto,
} from "@chavez-harness/shared";
import type { Hub, HubConnection } from "./hub.ts";

export type DaemonStatus = "online" | "offline" | "stale";

export function daemonStatusFor(hub: Hub, userId: string, workspaceId: string): DaemonStatus {
  return hub.findDaemon(userId, workspaceId) ? "online" : "offline";
}

export function connectionsFor(
  hub: Hub,
  userId: string,
  workspaceId: string,
): WorkspaceConnection[] {
  return hub.listForWorkspace(userId, workspaceId).map((c) => ({
    connectionId: c.connectionId,
    clientKind: c.clientKind,
    role: c.role,
    clientLabel: c.clientLabel,
  }));
}

/** Origin of an action taken over a socket: its bind label, else `api`. */
export function originOf(conn: Pick<HubConnection, "clientLabel"> | undefined): PushOrigin {
  return conn?.clientLabel ?? "api";
}

function push(type: string, extra: Record<string, unknown>) {
  return { push: true, eventId: crypto.randomUUID(), type, ...extra };
}

export function emitConnectionStatus(
  hub: Hub,
  userId: string,
  workspaceId: string,
  path: string,
  options: { exceptConnectionId?: string; daemonDesired?: DaemonDesired } = {},
) {
  hub.broadcastToWorkspace(
    userId,
    workspaceId,
    push("connection.status", {
      data: {
        linked: true,
        workspaceId,
        path,
        daemon: daemonStatusFor(hub, userId, workspaceId),
        ...(options.daemonDesired ? { daemonDesired: options.daemonDesired } : {}),
        connections: connectionsFor(hub, userId, workspaceId),
      },
    }),
    options.exceptConnectionId,
  );
}

/** Workspace row changed; goes to every connection of the user (dashboard, rail, TUI). */
export function emitWorkspaceUpdated(
  hub: Hub,
  userId: string,
  workspace: WorkspaceDto,
  reason: "bind" | "daemon.desired",
  origin: PushOrigin,
  exceptConnectionId?: string,
) {
  hub.broadcastToUser(
    userId,
    push("workspace.updated", {
      origin,
      data: {
        reason,
        workspace,
        daemonStatus: daemonStatusFor(hub, userId, workspace.id),
        connections: connectionsFor(hub, userId, workspace.id),
      },
    }),
    exceptConnectionId,
  );
}

export function emitMessageCreated(
  hub: Hub,
  userId: string,
  workspaceId: string,
  session: ChatSessionDto,
  message: ChatMessageDto,
  origin: PushOrigin,
  exceptConnectionId?: string,
) {
  hub.broadcastToWorkspace(
    userId,
    workspaceId,
    push("session.message.created", { origin, data: { workspaceId, session, message } }),
    exceptConnectionId,
  );
}

export function emitSessionUpdated(
  hub: Hub,
  userId: string,
  session: ChatSessionDto,
  options: {
    origin: PushOrigin;
    change: SessionChange;
    changed?: SessionSettingKey[];
    exceptConnectionId?: string;
  },
) {
  hub.broadcastToWorkspace(
    userId,
    session.workspaceId,
    push("session.updated", {
      origin: options.origin,
      change: options.change,
      ...(options.changed && options.changed.length > 0 ? { changed: options.changed } : {}),
      data: session,
    }),
    options.exceptConnectionId,
  );
}

export function emitSessionDeleted(
  hub: Hub,
  userId: string,
  deleted: { workspaceId: string; sessionId: string },
  origin: PushOrigin,
) {
  hub.broadcastToWorkspace(
    userId,
    deleted.workspaceId,
    push("session.deleted", {
      origin,
      data: { workspaceId: deleted.workspaceId, chatSessionId: deleted.sessionId },
    }),
  );
}
