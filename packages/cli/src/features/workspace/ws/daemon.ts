import { resolve } from "node:path";
import { loadCredentials } from "../../auth/api/credentials.ts";
import { ChavezWsClient } from "./client.ts";

const HEARTBEAT_MS = 2_000;

async function main() {
  const pathArg = process.argv[2];
  if (!pathArg) {
    console.error("Usage: bun src/features/workspace/ws/daemon.ts <workspace-path>");
    process.exit(1);
  }

  const workspacePath = resolve(pathArg);
  const credentials = await loadCredentials();
  if (!credentials?.sessionToken) {
    console.error("No hay sesión. Inicia sesión en el TUI primero.");
    process.exit(1);
  }

  const daemonId = crypto.randomUUID();
  let workspaceId: string | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const client = new ChavezWsClient({
    apiUrl: credentials.apiUrl,
    token: credentials.sessionToken,
    autoReconnect: true,
    onPush: (message) => {
      if (message.type === "workspace.ping.dispatch") {
        const requestId = message.requestId;
        const path = typeof message.path === "string" ? message.path : workspacePath;
        client.send({
          type: "workspace.ping.result",
          requestId,
          ok: true,
          data: { pong: true, path },
        });
      }
    },
  });

  async function bindAndStart() {
    await client.connect();
    const bind = await client.request<{
      workspaceId: string;
      role?: string;
    }>({
      type: "workspace.bind",
      id: crypto.randomUUID(),
      path: workspacePath,
      clientKind: "daemon",
      daemonId,
    });

    if (!bind.ok || !bind.data?.workspaceId) {
      throw new Error(bind.error ?? "workspace.bind failed");
    }

    workspaceId = bind.data.workspaceId;
    console.error(
      `[daemon] bound ${workspacePath} as ${bind.data.role ?? "daemon"} (${workspaceId})`,
    );

    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (!workspaceId) return;
      void client
        .request({
          type: "daemon.heartbeat",
          id: crypto.randomUUID(),
          workspaceId,
        })
        .catch((err) => {
          console.error("[daemon] heartbeat failed", err);
        });
    }, HEARTBEAT_MS);
  }

  await bindAndStart();

  const shutdown = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    client.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Keep process alive
  await new Promise(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
