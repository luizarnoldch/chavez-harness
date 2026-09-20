import type { DaemonPresencePush } from "@chavez-harness/shared";
import type { Hub } from "./hub.ts";

export const HEARTBEAT_STALE_MS = 5_000;
export const HEARTBEAT_SWEEP_MS = 1_000;

export function createHeartbeatSweeper(hub: Hub, staleMs = HEARTBEAT_STALE_MS) {
  let timer: ReturnType<typeof setInterval> | null = null;

  function emitPresence(userId: string, data: DaemonPresencePush["data"]) {
    const message: DaemonPresencePush = {
      type: "daemon.presence",
      push: true,
      eventId: crypto.randomUUID(),
      data,
    };
    hub.broadcastToUser(userId, message);
  }

  function sweep() {
    const now = Date.now();
    for (const conn of hub.all()) {
      if (conn.clientKind !== "daemon" || !conn.workspaceId) continue;
      if (now - conn.lastHeartbeatAt <= staleMs) continue;

      const workspaceId = conn.workspaceId;
      const connectionId = conn.connectionId;
      const role = conn.role ?? undefined;
      const userId = conn.userId;

      conn.socket.close(4001, "heartbeat stale");
      hub.unregister(connectionId);

      emitPresence(userId, {
        workspaceId,
        status: "stale",
        connectionId,
        role,
      });

      // Promote a standby if primary went stale
      if (role === "primary") {
        const next = hub.listDaemons(userId, workspaceId)[0];
        if (next) {
          hub.update(next.connectionId, { role: "primary" });
          emitPresence(userId, {
            workspaceId,
            status: "online",
            connectionId: next.connectionId,
            role: "primary",
          });
        }
      }
    }
  }

  return {
    start() {
      if (timer) return;
      timer = setInterval(sweep, HEARTBEAT_SWEEP_MS);
      if (typeof timer === "object" && "unref" in timer) {
        timer.unref();
      }
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    sweep,
    emitPresence,
  };
}

export type HeartbeatSweeper = ReturnType<typeof createHeartbeatSweeper>;
