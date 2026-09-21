import { resolve } from "node:path";
import { loadCredentials, type Credentials } from "../../auth/api/credentials.ts";
import { runCursorSdkGenerate } from "./cursor-sdk.ts";
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
  let generating = false;
  let client!: ChavezWsClient;

  async function bindDaemon(reconnect: boolean) {
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
      `[daemon] ${reconnect ? "rebound" : "bound"} ${workspacePath} as ${bind.data.role ?? "daemon"} (${workspaceId})`,
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

  client = new ChavezWsClient({
    apiUrl: credentials.apiUrl,
    token: credentials.sessionToken,
    autoReconnect: true,
    onOpen: async ({ reconnect }) => {
      await bindDaemon(reconnect);
    },
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
        return;
      }

      if (message.type === "chat.generate.dispatch") {
        void handleGenerate(message, credentials);
      }
    },
  });

  async function handleGenerate(
    message: Record<string, unknown>,
    creds: Credentials,
  ) {
    const requestId = typeof message.requestId === "string" ? message.requestId : null;
    if (!requestId) return;

    if (generating) {
      client.send({
        type: "chat.generate.result",
        requestId,
        ok: false,
        error: "Daemon ya está generando otra respuesta",
      });
      return;
    }

    generating = true;
    try {
      const sessionId =
        typeof message.sessionId === "string" ? message.sessionId : "";
      const wsId =
        typeof message.workspaceId === "string"
          ? message.workspaceId
          : workspaceId ?? "";
      const mode =
        message.mode === "build" || message.mode === "plan"
          ? message.mode
          : "plan";

      const outcome = await runCursorSdkGenerate({
        credentials: creds,
        jobId: String(message.jobId),
        unwrapToken: String(message.unwrapToken),
        model: String(message.model ?? "auto"),
        prompt: String(message.prompt ?? ""),
        workspacePath:
          typeof message.path === "string" ? message.path : workspacePath,
        mode,
        agentId:
          typeof message.agentId === "string" && message.agentId.length > 0
            ? message.agentId
            : null,
        onProgress: (progress) => {
          if (!requestId || !wsId || !sessionId) return;
          client.send({
            type: "chat.generate.progress",
            requestId,
            workspaceId: wsId,
            sessionId,
            phase: progress.phase,
            ...(progress.textDelta != null
              ? { textDelta: progress.textDelta }
              : {}),
            ...(progress.toolCall != null
              ? { toolCall: progress.toolCall }
              : {}),
          });
        },
      });
      client.send({
        type: "chat.generate.result",
        requestId,
        ok: true,
        data: {
          text: outcome.text,
          agentId: outcome.agentId,
          ...(outcome.usage ? { usage: outcome.usage } : {}),
          ...(outcome.parts?.length ? { parts: outcome.parts } : {}),
        },
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Cursor generate failed";
      console.error("[daemon] chat.generate failed", error);
      client.send({
        type: "chat.generate.result",
        requestId,
        ok: false,
        error,
      });
    } finally {
      generating = false;
    }
  }

  await client.connect();

  const shutdown = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    client.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await new Promise(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
