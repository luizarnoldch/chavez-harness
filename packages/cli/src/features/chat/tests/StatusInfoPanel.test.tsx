import { useKeyboard } from "@opentui/react";
import { testRender } from "@opentui/react/test-utils";
import type { TestRendererSetup } from "@opentui/core/testing";
import { describe, expect, test } from "bun:test";
import { act, useState } from "react";
import { matchesShortcut } from "../../../lib/registry/match";
import { getShortcut } from "../../../lib/registry/shortcuts";
import { StatusBar } from "../chrome/StatusBar";
import { StatusInfoPanel } from "../chrome/StatusInfoPanel";

function StatusChromeHarness({
  initialOpen = false,
}: {
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);

  useKeyboard((key) => {
    if (matchesShortcut(key, getShortcut("toggle-status-panel"))) {
      key.preventDefault();
      setOpen((prev) => !prev);
    }
  });

  return (
    <box flexDirection="column" width="100%" height="100%">
      <StatusBar
        open={open}
        onToggle={() => setOpen((prev) => !prev)}
        linkStatus="synced"
        workspacePath="/datos/Work/demo"
        sessionLabel="abcdef12"
        messageCount={3}
      />
      {open ? (
        <StatusInfoPanel
          user={{ id: "u1", name: "Ada", email: "ada@example.com" }}
          workspacePath="/datos/Work/demo"
          linkStatus="synced"
          sessionLabel="abcdef12"
          messageCount={3}
        />
      ) : null}
    </box>
  );
}

async function pressChord(
  setup: TestRendererSetup,
  key: string,
  mods: { ctrl?: boolean },
) {
  await act(async () => {
    setup.mockInput.pressKey(key, mods);
  });
  await act(async () => {
    await setup.flush();
  });
}

describe("StatusBar info panel", () => {
  test("panel muestra usuario, workspace y sesión", async () => {
    const setup = await testRender(<StatusChromeHarness initialOpen />, {
      width: 120,
      height: 12,
      exitOnCtrlC: false,
    });

    try {
      await act(async () => {
        await setup.renderOnce();
      });

      const frame = setup.captureCharFrame();
      expect(frame).toContain("Ada");
      expect(frame).toContain("ada@example.com");
      expect(frame).toContain("/datos/Work/demo");
      expect(frame).toContain("Sincronizado");
      expect(frame).toContain("abcdef12");
      expect(frame).toContain("3 msgs");
      expect(frame).toContain("▾");
    } finally {
      setup.renderer.destroy();
    }
  });

  test("Ctrl+U abre y cierra el panel", async () => {
    const setup = await testRender(<StatusChromeHarness />, {
      width: 120,
      height: 12,
      exitOnCtrlC: false,
    });

    try {
      await act(async () => {
        await setup.renderOnce();
      });

      expect(setup.captureCharFrame()).not.toContain("ada@example.com");

      await pressChord(setup, "u", { ctrl: true });
      await act(async () => {
        await setup.renderOnce();
      });

      expect(setup.captureCharFrame()).toContain("ada@example.com");

      await pressChord(setup, "u", { ctrl: true });
      await act(async () => {
        await setup.renderOnce();
      });

      expect(setup.captureCharFrame()).not.toContain("ada@example.com");
    } finally {
      setup.renderer.destroy();
    }
  });

  test("click en el botón toggle abre el panel", async () => {
    const setup = await testRender(<StatusChromeHarness />, {
      width: 120,
      height: 12,
      exitOnCtrlC: false,
    });

    try {
      await act(async () => {
        await setup.renderOnce();
      });

      await act(async () => {
        await setup.mockMouse.click(1, 0);
      });
      await act(async () => {
        await setup.flush();
      });
      await act(async () => {
        await setup.renderOnce();
      });

      const frame = setup.captureCharFrame();
      expect(frame).toContain("ada@example.com");
      expect(frame).toContain("Workspace");
      expect(frame).toContain("Sesión");
    } finally {
      setup.renderer.destroy();
    }
  });
});
