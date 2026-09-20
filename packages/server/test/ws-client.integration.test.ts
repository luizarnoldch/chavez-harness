import { describe, expect, test } from "bun:test";
import { websocket } from "hono/bun";
import { ChavezWsClient } from "../../cli/src/features/workspace/ws/client.ts";
import { createApp } from "../src/app.ts";
import { createMemoryChatService, createMemoryWorkspaceService } from "./memory-services.ts";

describe("CLI WsClient ↔ hub", () => {
  test("bind + ping round-trip", async () => {
    const workspaces = createMemoryWorkspaceService();
    const app = createApp({
      ws: { resolveUserId: async () => "cli-user" },
      workspaces,
      chat: createMemoryChatService(workspaces),
    });
    const running = Bun.serve({
      fetch: app.fetch,
      websocket,
      port: 0,
    });

    const apiUrl = `http://127.0.0.1:${running.port}`;

    const daemon = new ChavezWsClient({
      apiUrl,
      token: "t",
      autoReconnect: false,
      onPush: (msg) => {
        if (msg.type === "workspace.ping.dispatch") {
          daemon.send({
            type: "workspace.ping.result",
            requestId: msg.requestId,
            ok: true,
            data: { pong: true, path: "/tmp/demo" },
          });
        }
      },
    });

    const client = new ChavezWsClient({
      apiUrl,
      token: "t",
      autoReconnect: false,
    });

    try {
      await daemon.connect();
      const bindDaemon = await daemon.request({
        type: "workspace.bind",
        id: "bd",
        path: "/tmp/demo",
        clientKind: "daemon",
        daemonId: "d1",
      });
      expect(bindDaemon.ok).toBe(true);

      await client.connect();
      const bindClient = await client.request<{ workspaceId: string }>({
        type: "workspace.bind",
        id: "bc",
        path: "/tmp/demo",
        clientKind: "client",
      });
      expect(bindClient.ok).toBe(true);

      const ping = await client.request<{ pong: boolean; path: string }>({
        type: "workspace.ping",
        id: "ping",
        workspaceId: bindClient.data!.workspaceId,
      });
      expect(ping.ok).toBe(true);
      expect(ping.data?.pong).toBe(true);
    } finally {
      daemon.close();
      client.close();
      running.stop(true);
    }
  });
});
