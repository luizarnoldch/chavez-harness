import { describe, expect, test } from "bun:test";
import type { ChatSessionDto } from "@chavez-harness/shared";
import {
  getWorkspaceBridge,
  resetWorkspaceBridge,
  type WorkspaceBridge,
} from "../bridge";

describe("WorkspaceBridge.listSessions", () => {
  test("delega en session.list del workspace actual", async () => {
    resetWorkspaceBridge();
    const bridge = getWorkspaceBridge();
    const listed: ChatSessionDto[] = [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        title: "Demo",
        mode: "plan",
        provider: "local",
        model: "eco",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessageAt: null,
      },
    ];

    Object.assign(bridge, {
      getState: () => ({
        status: "synced",
        path: "/tmp",
        workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        chatSessionId: listed[0]!.id,
        error: null,
        generateStream: null,
        machineOnline: true,
      }),
      listSessions: async () => listed,
    } satisfies Partial<WorkspaceBridge>);

    const sessions = await bridge.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.title).toBe("Demo");
  });

  test("falla si no hay workspace conectado", async () => {
    resetWorkspaceBridge();
    const bridge = getWorkspaceBridge();
    await expect(bridge.listSessions()).rejects.toThrow("Workspace no conectado");
  });
});
