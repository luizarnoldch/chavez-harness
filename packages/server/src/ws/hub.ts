import type { ClientKind, DaemonRole } from "@chavez-harness/shared";

export type WsSender = {
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
};

export type HubConnection = {
  connectionId: string;
  userId: string;
  socket: WsSender;
  clientKind: ClientKind | null;
  workspaceId: string | null;
  workspacePath: string | null;
  daemonId: string | null;
  role: DaemonRole | null;
  machineId: string | null;
  hostname: string | null;
  lastHeartbeatAt: number;
};

export function createHub() {
  const byId = new Map<string, HubConnection>();
  const byUser = new Map<string, Set<string>>();

  function addToUser(userId: string, connectionId: string) {
    let set = byUser.get(userId);
    if (!set) {
      set = new Set();
      byUser.set(userId, set);
    }
    set.add(connectionId);
  }

  function removeFromUser(userId: string, connectionId: string) {
    const set = byUser.get(userId);
    if (!set) return;
    set.delete(connectionId);
    if (set.size === 0) byUser.delete(userId);
  }

  return {
    register(connection: HubConnection) {
      byId.set(connection.connectionId, connection);
      addToUser(connection.userId, connection.connectionId);
    },

    get(connectionId: string): HubConnection | undefined {
      return byId.get(connectionId);
    },

    unregister(connectionId: string): HubConnection | undefined {
      const conn = byId.get(connectionId);
      if (!conn) return undefined;
      byId.delete(connectionId);
      removeFromUser(conn.userId, connectionId);
      return conn;
    },

    update(connectionId: string, patch: Partial<HubConnection>) {
      const conn = byId.get(connectionId);
      if (!conn) return undefined;
      Object.assign(conn, patch);
      return conn;
    },

    listForUser(userId: string): HubConnection[] {
      const ids = byUser.get(userId);
      if (!ids) return [];
      return [...ids]
        .map((id) => byId.get(id))
        .filter((c): c is HubConnection => c != null);
    },

    findDaemon(userId: string, workspaceId: string): HubConnection | undefined {
      return this.listForUser(userId).find(
        (c) =>
          c.clientKind === "daemon" &&
          c.workspaceId === workspaceId &&
          c.role === "primary",
      );
    },

    listDaemons(userId: string, workspaceId: string): HubConnection[] {
      return this.listForUser(userId).filter(
        (c) => c.clientKind === "daemon" && c.workspaceId === workspaceId,
      );
    },

    listForWorkspace(userId: string, workspaceId: string): HubConnection[] {
      return this.listForUser(userId).filter((c) => c.workspaceId === workspaceId);
    },

    /** One host per user (v1). Prefer most recent heartbeat. */
    findHost(userId: string): HubConnection | undefined {
      const hosts = this.listForUser(userId).filter((c) => c.clientKind === "host");
      if (hosts.length === 0) return undefined;
      return hosts.reduce((best, cur) =>
        cur.lastHeartbeatAt >= best.lastHeartbeatAt ? cur : best,
      );
    },

    listHosts(userId: string): HubConnection[] {
      return this.listForUser(userId).filter((c) => c.clientKind === "host");
    },

    machineStatus(userId: string): "online" | "offline" {
      return this.findHost(userId) ? "online" : "offline";
    },

    sendTo(connectionId: string, message: unknown): boolean {
      const conn = byId.get(connectionId);
      if (!conn) return false;
      conn.socket.send(JSON.stringify(message));
      return true;
    },

    broadcastToUser(userId: string, message: unknown, exceptConnectionId?: string) {
      const payload = JSON.stringify(message);
      for (const conn of this.listForUser(userId)) {
        if (exceptConnectionId && conn.connectionId === exceptConnectionId) continue;
        conn.socket.send(payload);
      }
    },

    broadcastToWorkspace(
      userId: string,
      workspaceId: string,
      message: unknown,
      exceptConnectionId?: string,
    ) {
      const payload = JSON.stringify(message);
      for (const conn of this.listForUser(userId)) {
        if (conn.workspaceId !== workspaceId) continue;
        if (exceptConnectionId && conn.connectionId === exceptConnectionId) continue;
        conn.socket.send(payload);
      }
    },

    /** Test / sweep helper */
    all(): HubConnection[] {
      return [...byId.values()];
    },
  };
}

export type Hub = ReturnType<typeof createHub>;
