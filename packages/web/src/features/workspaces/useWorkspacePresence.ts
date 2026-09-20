"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkspaceConnection } from "@chavez-harness/shared";
import {
  getMachineStatus,
  getWorkspaceConnections,
  setWorkspaceDaemon,
} from "@/lib/api";
import { ChavezWsClient } from "@/lib/ws-client";
import type { DaemonStatus, MachineStatus, PresenceState } from "./PresencePanel";

function toPresence(
  daemon: DaemonStatus,
  connections: WorkspaceConnection[],
  extras?: Partial<PresenceState>,
): PresenceState {
  return { daemon, connections, ...extras };
}

/**
 * Snapshot REST + live WS (bind + connection.status / daemon.presence / machine.presence).
 */
export function useWorkspacePresence(
  workspaceId: string | null,
  path: string | null,
): {
  presence: PresenceState | null;
  live: "connecting" | "live" | "offline";
  machineStatus: MachineStatus;
  activate: () => Promise<void>;
  deactivate: () => Promise<void>;
  controlling: boolean;
  controlError: string | null;
} {
  const [presence, setPresence] = useState<PresenceState | null>(null);
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");
  const [machineStatus, setMachineStatus] = useState<MachineStatus>("offline");
  const [controlling, setControlling] = useState(false);
  const [controlError, setControlError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!workspaceId || !path) {
      setLive("offline");
      return;
    }

    let cancelled = false;
    const client = new ChavezWsClient({
      autoReconnect: true,
      onPush: (msg) => {
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
            connections?: WorkspaceConnection[];
          };
          if (data.workspaceId !== workspaceId) return;
          setPresence((prev) =>
            toPresence(data.daemon ?? "offline", data.connections ?? [], {
              daemonDesired: prev?.daemonDesired,
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
          setPresence((prev) =>
            toPresence(data.status!, prev?.connections ?? [], {
              daemonDesired: prev?.daemonDesired,
              machineStatus: prev?.machineStatus ?? machineStatus,
            }),
          );
        }
      },
    });

    void (async () => {
      try {
        await client.connect();
        if (cancelled) return;
        await client.request("workspace.bind", {
          path,
          clientKind: "client",
        });
        if (cancelled) return;
        const sync = await client.request<{
          daemonStatus: DaemonStatus;
          machineStatus?: MachineStatus;
          workspace?: { daemonDesired?: "on" | "off" };
          connections?: WorkspaceConnection[];
        }>("workspace.sync", { workspaceId });
        if (cancelled) return;
        if (sync.machineStatus) setMachineStatus(sync.machineStatus);
        setPresence(
          toPresence(sync.daemonStatus, sync.connections ?? [], {
            daemonDesired: sync.workspace?.daemonDesired,
            machineStatus: sync.machineStatus,
          }),
        );
        setLive("live");
      } catch {
        if (!cancelled) setLive("offline");
      }
    })();

    return () => {
      cancelled = true;
      client.close();
    };
  }, [workspaceId, path]);

  const activate = useCallback(async () => {
    if (!workspaceId) return;
    setControlling(true);
    setControlError(null);
    try {
      const result = await setWorkspaceDaemon(workspaceId, "on", "web");
      setMachineStatus(result.machineStatus);
      setPresence((prev) =>
        toPresence(result.daemonStatus, prev?.connections ?? [], {
          daemonDesired: result.workspace.daemonDesired,
          machineStatus: result.machineStatus,
        }),
      );
    } catch (err) {
      setControlError(err instanceof Error ? err.message : "Error al activar");
    } finally {
      setControlling(false);
    }
  }, [workspaceId]);

  const deactivate = useCallback(async () => {
    if (!workspaceId) return;
    setControlling(true);
    setControlError(null);
    try {
      const result = await setWorkspaceDaemon(workspaceId, "off", "web");
      setMachineStatus(result.machineStatus);
      setPresence((prev) =>
        toPresence(result.daemonStatus, prev?.connections ?? [], {
          daemonDesired: result.workspace.daemonDesired,
          machineStatus: result.machineStatus,
        }),
      );
    } catch (err) {
      setControlError(err instanceof Error ? err.message : "Error al desactivar");
    } finally {
      setControlling(false);
    }
  }, [workspaceId]);

  return {
    presence,
    live,
    machineStatus,
    activate,
    deactivate,
    controlling,
    controlError,
  };
}
