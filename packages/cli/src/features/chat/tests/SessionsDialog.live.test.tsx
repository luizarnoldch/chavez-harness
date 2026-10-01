import { testRender } from "@opentui/react/test-utils";
import type { TestRendererSetup } from "@opentui/core/testing";
import { describe, expect, test } from "bun:test";
import { act } from "react";
import { ToastProvider } from "../../../lib/providers/Toast";
import { WorkspaceConnectionContext } from "../../workspace/ui/WorkspaceConnection";
import {
  SESSION_A,
  SESSION_B,
  WS_ID,
  createFakeServer,
  makeSession,
} from "../../workspace/tests/fake-server";
import { SessionsDialog } from "../dialogs/SessionsDialog";

const SESSION_NEW = "ffffffff-ffff-4fff-8fff-ffffffffffff";

async function settle(setup: TestRendererSetup) {
  // Bridge requests and React updates both resolve asynchronously: give them a few turns.
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await Bun.sleep(10);
      await setup.renderOnce();
    });
  }
}

async function mountDialog() {
  const server = createFakeServer();
  server.addSession(
    makeSession(SESSION_A, { title: "Alfa", lastMessageAt: "2026-09-30T10:00:00.000Z" }),
  );
  server.addSession(
    makeSession(SESSION_B, { title: "Beta", lastMessageAt: "2026-09-29T10:00:00.000Z" }),
  );
  const bridge = server.newBridge();
  await bridge.connect("http://localhost:3001", "token", "/tmp/ws-dialog");

  const selected: string[] = [];
  const setup = await testRender(
    <WorkspaceConnectionContext.Provider
      value={{ bridge, state: bridge.getState(), ready: true, status: "synced" }}
    >
      <ToastProvider>
        <SessionsDialog
          currentSessionId={SESSION_A}
          onClose={() => {}}
          onSelect={(id) => selected.push(id)}
        />
      </ToastProvider>
    </WorkspaceConnectionContext.Provider>,
    { width: 80, height: 14, exitOnCtrlC: false },
  );
  await settle(setup);
  return { server, bridge, setup, selected };
}

describe("SessionsDialog live list", () => {
  test("shows the sessions, then picks up creations and deletions from the bridge", async () => {
    const { server, setup } = await mountDialog();
    try {
      let frame = setup.captureCharFrame();
      expect(frame).toContain("Alfa");
      expect(frame).toContain("Beta");

      await act(async () => {
        server.push({
          type: "session.updated",
          origin: "web",
          change: "created",
          data: makeSession(SESSION_NEW, { title: "Gamma web" }),
        });
      });
      await settle(setup);
      frame = setup.captureCharFrame();
      expect(frame).toContain("Gamma web");
      expect(frame).toContain("Alfa");

      await act(async () => {
        server.push({
          type: "session.deleted",
          origin: "web",
          data: { workspaceId: WS_ID, chatSessionId: SESSION_B },
        });
      });
      await settle(setup);
      frame = setup.captureCharFrame();
      expect(frame).not.toContain("Beta");
      expect(frame).toContain("Gamma web");
    } finally {
      setup.renderer.destroy();
    }
  });

  test("the selection stays on the same session when rows are inserted above it", async () => {
    const { server, setup, selected } = await mountDialog();
    try {
      await act(async () => {
        server.push({
          type: "session.updated",
          origin: "web",
          change: "created",
          data: makeSession(SESSION_NEW, { title: "Gamma web" }),
        });
      });
      await settle(setup);

      await act(async () => {
        setup.mockInput.pressEnter();
      });
      await settle(setup);
      // Opened on the current session (Alfa); the new row on top did not steal the cursor.
      expect(selected).toEqual([SESSION_A]);
    } finally {
      setup.renderer.destroy();
    }
  });

  test("when the selected row is removed remotely the cursor lands on a neighbour", async () => {
    const { server, setup, selected } = await mountDialog();
    try {
      server.sessions.delete(SESSION_A);
      await act(async () => {
        server.push({
          type: "session.deleted",
          origin: "web",
          data: { workspaceId: WS_ID, chatSessionId: SESSION_A },
        });
      });
      await settle(setup);
      expect(setup.captureCharFrame()).not.toContain("Alfa");

      await act(async () => {
        setup.mockInput.pressEnter();
      });
      await settle(setup);
      expect(selected).toEqual([SESSION_B]);
    } finally {
      setup.renderer.destroy();
    }
  });
});
