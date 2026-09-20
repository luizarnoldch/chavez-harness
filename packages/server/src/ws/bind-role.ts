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
  });
}
