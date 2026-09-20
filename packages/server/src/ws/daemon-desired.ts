import {
  NO_HOST_ERROR,
  type DaemonDesired,
  type DaemonDesiredSource,
  type DaemonStartResult,
  type DaemonStopResult,
  type WorkspaceDto,
} from "@chavez-harness/shared";
import type { WorkspaceService } from "../services/chat.ts";
import type { Hub } from "./hub.ts";
import type { PendingRegistry } from "./pending.ts";

const DAEMON_CONTROL_TIMEOUT_MS = 45_000;

export type SetDaemonDesiredResult = {
  workspace: WorkspaceDto;
  ignored: boolean;
  daemonStatus: "online" | "offline" | "stale";
};

export async function applyDaemonDesired(args: {
  hub: Hub;
  pending: PendingRegistry;
  workspaces: WorkspaceService;
  userId: string;
  workspaceId: string;
  desired: DaemonDesired;
  source: DaemonDesiredSource;
}): Promise<SetDaemonDesiredResult> {
  const { hub, pending, workspaces, userId, workspaceId, desired, source } = args;

  const { workspace, ignored } = await workspaces.setDaemonDesired(
    userId,
    workspaceId,
    desired,
    source,
  );

  if (ignored) {
    return {
      workspace,
      ignored: true,
      daemonStatus: hub.findDaemon(userId, workspaceId) ? "online" : "offline",
    };
  }

  const host = hub.findHost(userId);
  if (!host) {
    if (desired === "on") {
      throw new Error(NO_HOST_ERROR);
    }
    return {
      workspace,
      ignored: false,
      daemonStatus: "offline",
    };
  }

  const requestId = crypto.randomUUID();
  if (desired === "on") {
    const waitPromise = pending.wait<DaemonStartResult>(requestId, DAEMON_CONTROL_TIMEOUT_MS);
    hub.sendTo(host.connectionId, {
      push: true,
      eventId: crypto.randomUUID(),
      type: "daemon.start.dispatch",
      requestId,
      workspaceId,
      path: workspace.path,
    });
    const result = await waitPromise;
    if (!result.ok) {
      throw new Error(result.error ?? "No se pudo arrancar el daemon");
    }
  } else {
    const waitPromise = pending.wait<DaemonStopResult>(requestId, DAEMON_CONTROL_TIMEOUT_MS);
    hub.sendTo(host.connectionId, {
      push: true,
      eventId: crypto.randomUUID(),
      type: "daemon.stop.dispatch",
      requestId,
      workspaceId,
      path: workspace.path,
    });
    const result = await waitPromise;
    if (!result.ok) {
      throw new Error(result.error ?? "No se pudo detener el daemon");
    }
  }

  return {
    workspace,
    ignored: false,
    daemonStatus: hub.findDaemon(userId, workspaceId) ? "online" : "offline",
  };
}
