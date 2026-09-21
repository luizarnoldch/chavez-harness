import { describe, expect, test } from "bun:test";
import { NO_DAEMON_ERROR, NO_HOST_ERROR } from "@chavez-harness/shared";
import { runCursorGenerate } from "../src/services/cursor-generate.ts";
import { createHub, type HubConnection } from "../src/ws/hub.ts";
import { createPendingRegistry } from "../src/ws/pending.ts";

function register(
  hub: ReturnType<typeof createHub>,
  overrides: Partial<HubConnection>,
): HubConnection {
  const conn: HubConnection = {
    connectionId: overrides.connectionId ?? crypto.randomUUID(),
    userId: overrides.userId ?? "user-1",
    socket: overrides.socket ?? { send: () => {}, close: () => {} },
    clientKind: overrides.clientKind ?? null,
    workspaceId: overrides.workspaceId ?? null,
    workspacePath: overrides.workspacePath ?? null,
    daemonId: overrides.daemonId ?? null,
    role: overrides.role ?? null,
    machineId: overrides.machineId ?? null,
    hostname: overrides.hostname ?? null,
    lastHeartbeatAt: overrides.lastHeartbeatAt ?? Date.now(),
  };
  hub.register(conn);
  return conn;
}

const baseArgs = {
  userId: "user-1",
  workspaceId: "11111111-1111-4111-8111-111111111111",
  workspacePath: "/tmp/proj",
  sessionId: "22222222-2222-4222-8222-222222222222",
  model: "auto",
  prompt: "hola",
  mode: "plan" as const,
};

describe("runCursorGenerate", () => {
  test("throws NO_HOST_ERROR when neither host nor daemon", async () => {
    const hub = createHub();
    await expect(
      runCursorGenerate({
        ...baseArgs,
        hub,
        pending: createPendingRegistry(1000),
        jobs: {
          create: () => ({
            jobId: "j",
            userId: "user-1",
            provider: "cursor",
            unwrapToken: "t",
            expiresAt: Date.now() + 60_000,
          }),
          consume: () => null,
          peek: () => undefined,
          size: () => 0,
        },
      }),
    ).rejects.toThrow(NO_HOST_ERROR);
  });

  test("throws NO_DAEMON_ERROR when host online but no daemon", async () => {
    const hub = createHub();
    register(hub, {
      connectionId: "host",
      clientKind: "host",
      machineId: "m1",
      role: "primary",
    });

    await expect(
      runCursorGenerate({
        ...baseArgs,
        hub,
        pending: createPendingRegistry(1000),
        jobs: {
          create: () => ({
            jobId: "j",
            userId: "user-1",
            provider: "cursor",
            unwrapToken: "t",
            expiresAt: Date.now() + 60_000,
          }),
          consume: () => null,
          peek: () => undefined,
          size: () => 0,
        },
      }),
    ).rejects.toThrow(NO_DAEMON_ERROR);
  });
});
