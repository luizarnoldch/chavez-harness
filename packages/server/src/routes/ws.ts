import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import type { ChatService, WorkspaceService } from "../services/chat.ts";
import type { ProviderCredentialsService } from "../services/providers.ts";
import type { ProviderJobStore } from "../services/provider-jobs.ts";
import { resolveWsUserId, type ResolveWsUserId } from "../ws/auth.ts";
import { handleWsMessage, onConnectionClosed, type HandlerDeps } from "../ws/handlers.ts";
import { createHeartbeatSweeper } from "../ws/heartbeat.ts";
import { createHub, type Hub } from "../ws/hub.ts";
import { createPendingRegistry, type PendingRegistry } from "../ws/pending.ts";

export type WsRouteOptions = {
  resolveUserId?: ResolveWsUserId;
  hub?: Hub;
  pending?: PendingRegistry;
  workspaces?: WorkspaceService;
  chat?: ChatService;
  providers?: ProviderCredentialsService;
  jobs?: ProviderJobStore;
};

export function createWsRoute(options: WsRouteOptions = {}) {
  const hub = options.hub ?? createHub();
  const pending = options.pending ?? createPendingRegistry();
  const resolveUserId = options.resolveUserId ?? resolveWsUserId;
  const heartbeat = createHeartbeatSweeper(hub);
  heartbeat.start();

  if (!options.workspaces || !options.chat || !options.providers || !options.jobs) {
    throw new Error("createWsRoute requires workspaces, chat, providers, and jobs");
  }

  const deps: HandlerDeps = {
    hub,
    pending,
    heartbeat,
    workspaces: options.workspaces,
    chat: options.chat,
    providers: options.providers,
    jobs: options.jobs,
  };
  const route = new Hono();

  route.get("/ws", async (c, next) => {
    const userId = await resolveUserId(c.req.raw);
    if (!userId) {
      return c.text("Unauthorized", 401);
    }

    return upgradeWebSocket(() => {
      const connectionId = crypto.randomUUID();

      return {
        onOpen(_event, ws) {
          hub.register({
            connectionId,
            userId,
            socket: {
              send: (data) => ws.send(data),
              close: (code, reason) => ws.close(code, reason),
            },
            clientKind: null,
            workspaceId: null,
            workspacePath: null,
            daemonId: null,
            role: null,
            machineId: null,
            hostname: null,
            lastHeartbeatAt: Date.now(),
          });
        },
        async onMessage(event, _ws) {
          if (typeof event.data !== "string") return;
          const conn = hub.get(connectionId);
          if (!conn) return;
          await handleWsMessage(conn, event.data, deps);
        },
        onClose() {
          const conn = hub.get(connectionId);
          if (conn) onConnectionClosed(conn, deps);
        },
        onError(_event, ws) {
          ws.close();
        },
      };
    })(c, next);
  });

  return { route, hub, pending, heartbeat, stop: () => heartbeat.stop() };
}
