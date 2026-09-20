import type { DaemonRole } from "@chavez-harness/shared";
import type { Hub, HubConnection } from "./hub.ts";

export type BindDaemonResult = {
  role: DaemonRole;
  closedZombieIds: string[];
};

/**
 * Assign primary/standby. Same daemonId reclaim closes the previous socket.
 */
export function assignDaemonRole(
  hub: Hub,
  incoming: HubConnection,
  daemonId: string,
): BindDaemonResult {
  const closedZombieIds: string[] = [];
  const workspaceId = incoming.workspaceId;
  if (!workspaceId) {
    return { role: "standby", closedZombieIds };
  }

  const siblings = hub.listDaemons(incoming.userId, workspaceId);

  for (const sibling of siblings) {
    if (sibling.connectionId === incoming.connectionId) continue;
    if (sibling.daemonId === daemonId) {
      sibling.socket.close(4000, "daemon reclaimed");
      hub.unregister(sibling.connectionId);
      closedZombieIds.push(sibling.connectionId);
    }
  }

  const remaining = hub
    .listDaemons(incoming.userId, workspaceId)
    .filter((c) => c.connectionId !== incoming.connectionId);
  const hasPrimary = remaining.some((c) => c.role === "primary");
  const role: DaemonRole = hasPrimary ? "standby" : "primary";

  hub.update(incoming.connectionId, {
    clientKind: "daemon",
    daemonId,
    role,
    lastHeartbeatAt: Date.now(),
  });

  return { role, closedZombieIds };
}

export function assignClientRole(hub: Hub, connectionId: string) {
  hub.update(connectionId, {
    clientKind: "client",
    daemonId: null,
    role: null,
    machineId: null,
    hostname: null,
  });
}

/**
 * Bind as machine host. V1: one host per user — closes any other host sockets.
 */
export function assignHostRole(
  hub: Hub,
  connectionId: string,
  machineId: string,
  hostname: string | null,
): { closedZombieIds: string[] } {
  const conn = hub.get(connectionId);
  if (!conn) return { closedZombieIds: [] };

  const closedZombieIds: string[] = [];
  for (const sibling of hub.listHosts(conn.userId)) {
    if (sibling.connectionId === connectionId) continue;
    sibling.socket.close(4000, "host reclaimed");
    hub.unregister(sibling.connectionId);
    closedZombieIds.push(sibling.connectionId);
  }

  hub.update(connectionId, {
    clientKind: "host",
    machineId,
    hostname,
    workspaceId: null,
    workspacePath: null,
    daemonId: null,
    role: null,
    lastHeartbeatAt: Date.now(),
  });

  return { closedZombieIds };
}

