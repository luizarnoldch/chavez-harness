"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatSessionDto, WorkspaceConnection } from "@chavez-harness/shared";
import {
  getMachineStatus,
  getWorkspaceConnections,
  setWorkspaceDaemon,
} from "@/lib/api";
import type { SocketLive } from "@/lib/ws/shared-socket";
import { useChavezSocket, useSocketPush } from "@/lib/ws/useChavezSocket";
import type { DaemonStatus, MachineStatus, PresenceState } from "./PresencePanel";

function toPresence(
  daemon: DaemonStatus,
  connections: WorkspaceConnection[],
  extras?: Partial<PresenceState>,
): PresenceState {
  return { daemon, connections, ...extras };
}

export type WorkspacePresenceSessionHandlers = {
  onSessionUpdated?: (session: ChatSessionDto) => void;
  onSessionDeleted?: (payload: {
    workspaceId: string;
    chatSessionId: string;
  }) => void;
};

const PRESENCE_PUSHES = [
  "machine.presence",
  "workspace.updated",
  "connection.status",
  "daemon.presence",
  "session.updated",
  "session.deleted",
] as const;

/**
 * Snapshot REST + live WS (connection.status / daemon.presence / machine.presence)
 * over the page's shared socket (`useChavezSocket`).
 * Optional session handlers receive workspace-scoped session.updated / session.deleted pushes.
 */
export function useWorkspacePresence(
  workspaceId: string | null,
  path: string | null,
  sessionHandlers?: WorkspacePresenceSessionHandlers,
): {
  presence: PresenceState | null;
  live: SocketLive;
  machineStatus: MachineStatus;
  activate: () => Promise<void>;
  deactivate: () => Promise<void>;
  controlling: boolean;
  controlError: string | null;
} {
  const [presence, setPresence] = useState<PresenceState | null>(null);
  const [machineStatus, setMachineStatus] = useState<MachineStatus>("offline");
  const [controlling, setControlling] = useState(false);
  const [controlError, setControlError] = useState<string | null>(null);

  const { socket, live, sync } = useChavezSocket(workspaceId, path);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    void Promise.all([getWorkspaceConnections(workspaceId), getMachineStatus()])
      .then(([data, machine]) => {
        if (cancelled) return;
        setMachineStatus(machine.status);
        setPresence(
          toPresence(data.daemon, data.connections, {
            daemonDesired: data.daemonDesired,
            machineStatus: data.machineStatus ?? machine.status,
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setPresence(toPresence("offline", [], { machineStatus: "offline" }));
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // Every (re)bind ends with a workspace.sync: take it as the fresh snapshot.
  useEffect(() => {
    if (!sync) return;
    if (sync.machineStatus) setMachineStatus(sync.machineStatus);
    setPresence(
      toPresence(sync.daemonStatus, sync.connections ?? [], {
        daemonDesired: sync.workspace.daemonDesired,
        machineStatus: sync.machineStatus,
      }),
    );
  }, [sync]);

  useSocketPush(socket, PRESENCE_PUSHES, (msg) => {
    if (msg.type === "machine.presence") {
      const data = msg.data as { status?: MachineStatus };
      if (data.status) {
        setMachineStatus(data.status);
        setPresence((prev) =>
          prev
            ? { ...prev, machineStatus: data.status }
            : toPresence("offline", [], { machineStatus: data.status }),
        );
      }
    }
    if (msg.type === "connection.status") {
      const data = msg.data as {
        workspaceId?: string;
        daemon?: DaemonStatus;
        daemonDesired?: "on" | "off";
        connections?: WorkspaceConnection[];
      };
      if (data.workspaceId !== workspaceId) return;
      setPresence((prev) =>
        toPresence(data.daemon ?? "offline", data.connections ?? [], {
          daemonDesired: data.daemonDesired ?? prev?.daemonDesired,
          machineStatus: prev?.machineStatus ?? machineStatus,
        }),
      );
    }
    if (msg.type === "workspace.updated") {
      const data = msg.data as {
        workspace?: { id?: string; daemonDesired?: "on" | "off" };
        daemonStatus?: DaemonStatus;
        connections?: WorkspaceConnection[];
      };
      if (data.workspace?.id !== workspaceId) return;
      setPresence((prev) =>
        toPresence(data.daemonStatus ?? prev?.daemon ?? "offline", data.connections ?? prev?.connections ?? [], {
          daemonDesired: data.workspace?.daemonDesired ?? prev?.daemonDesired,
          machineStatus: prev?.machineStatus ?? machineStatus,
        }),
      );
    }
    if (msg.type === "daemon.presence") {
      const data = msg.data as {
        workspaceId?: string;
        status?: DaemonStatus;
      };
      if (data.workspaceId !== workspaceId || !data.status) return;
      const status = data.status;
      setPresence((prev) =>
        toPresence(status, prev?.connections ?? [], {
          daemonDesired: prev?.daemonDesired,
          machineStatus: prev?.machineStatus ?? machineStatus,
        }),
      );
    }
    if (msg.type === "session.updated") {
      const session = msg.data as ChatSessionDto;
      if (session.workspaceId !== workspaceId) return;
      sessionHandlers?.onSessionUpdated?.(session);
    }
    if (msg.type === "session.deleted") {
      const data = msg.data as {
        workspaceId?: string;
        chatSessionId?: string;
      };
      if (data.workspaceId !== workspaceId || !data.chatSessionId) return;
      sessionHandlers?.onSessionDeleted?.({
        workspaceId: data.workspaceId,
        chatSessionId: data.chatSessionId,
      });
    }
  });

  const control = useCallback(
    async (desired: "on" | "off") => {
      if (!workspaceId) return;
      setControlling(true);
      setControlError(null);
      try {
        const result = await setWorkspaceDaemon(workspaceId, desired, "web");
        setMachineStatus(result.machineStatus);
        setPresence((prev) =>
          toPresence(result.daemonStatus, prev?.connections ?? [], {
            daemonDesired: result.workspace.daemonDesired,
            machineStatus: result.machineStatus,
          }),
        );
      } catch (err) {
        setControlError(
          err instanceof Error
            ? err.message
            : desired === "on"
              ? "Error al activar"
              : "Error al desactivar",
        );
      } finally {
        setControlling(false);
      }
    },
    [workspaceId],
  );

  const activate = useCallback(() => control("on"), [control]);
  const deactivate = useCallback(() => control("off"), [control]);

  return {
    presence,
    live: workspaceId && path ? live : "offline",
    machineStatus,
    activate,
    deactivate,
    controlling,
    controlError,
  };
}
