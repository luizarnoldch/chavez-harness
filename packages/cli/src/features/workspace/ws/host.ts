import { hostname as osHostname } from "node:os";
import { loadCredentials } from "../../auth/api/credentials.ts";
import { ChavezWsClient } from "./client.ts";
import {
  clearHostLock,
  machineIdForHost,
} from "./ensure-host.ts";
import {
  ensureWorkspaceDaemon,
  stopWorkspaceDaemon,
} from "./ensure-daemon.ts";

async function main() {
  const credentials = await loadCredentials();
  if (!credentials?.sessionToken) {
    console.error("No hay sesión. Inicia sesión en el TUI primero.");
    process.exit(1);
  }

  const machineId = machineIdForHost();
  const hostname = osHostname();

  let client!: ChavezWsClient;

  async function bindHost(reconnect: boolean) {
    const bind = await client.request<{ machineId: string }>({
      type: "host.bind",
      id: crypto.randomUUID(),
      machineId,
      hostname,
    });

    if (!bind.ok) {
      throw new Error(bind.error ?? "host.bind failed");
    }

    console.error(
      `[host] ${reconnect ? "rebound" : "online"} machineId=${machineId} hostname=${hostname}`,
    );
  }

  client = new ChavezWsClient({
    apiUrl: credentials.apiUrl,
    token: credentials.sessionToken,
    autoReconnect: true,
    onOpen: async ({ reconnect }) => {
      await bindHost(reconnect);
    },
    onPush: (message) => {
      if (message.type === "daemon.start.dispatch") {
        void handleStart(message);
        return;
      }
      if (message.type === "daemon.stop.dispatch") {
        void handleStop(message);
      }
    },
  });

  async function handleStart(message: Record<string, unknown>) {
    const requestId = typeof message.requestId === "string" ? message.requestId : null;
    const path = typeof message.path === "string" ? message.path : null;
    if (!requestId || !path) return;

    try {
      const result = await ensureWorkspaceDaemon(path);
      client.send({
        type: "daemon.start.result",
        requestId,
        ok: true,
        data: { pid: result.pid, spawned: result.spawned },
      });
    } catch (err) {
      client.send({
        type: "daemon.start.result",
        requestId,
        ok: false,
        error: err instanceof Error ? err.message : "Start failed",
      });
    }
  }

  async function handleStop(message: Record<string, unknown>) {
    const requestId = typeof message.requestId === "string" ? message.requestId : null;
    const path = typeof message.path === "string" ? message.path : null;
    if (!requestId || !path) return;

    try {
      const result = await stopWorkspaceDaemon(path);
      client.send({
        type: "daemon.stop.result",
        requestId,
        ok: true,
        data: { stopped: result.stopped },
      });
    } catch (err) {
      client.send({
        type: "daemon.stop.result",
        requestId,
        ok: false,
        error: err instanceof Error ? err.message : "Stop failed",
      });
    }
  }

  try {
    await client.connect();
  } catch (err) {
    console.error(err instanceof Error ? err.message : "host.bind failed");
    process.exit(1);
  }

  const shutdown = async () => {
    client.close();
    await clearHostLock();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
