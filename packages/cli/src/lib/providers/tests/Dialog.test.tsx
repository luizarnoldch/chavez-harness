import { testRender } from "@opentui/react/test-utils";
import { describe, expect, test } from "bun:test";
import { act, useEffect } from "react";
import { ModelsDialog } from "../../../features/chat/dialogs/ModelsDialog";
import { COMMANDS } from "../../registry/commands";
import { DialogProvider, useDialog } from "../Dialog";

function Harness({
  onReady,
}: {
  onReady: (api: { open: (id: string) => void; close: () => void }) => void;
}) {
  const { current, open, close } = useDialog();
  useEffect(() => {
    onReady({ open, close });
  }, [onReady, open, close]);
  if (current !== "models") return null;
  return (
    <ModelsDialog
      onClose={close}
      onSelect={() => {
        close();
      }}
      currentProvider="cursor"
      currentModel="auto"
    />
  );
}

describe("dialog", () => {
  test("open muestra Modelo y close lo quita", async () => {
    let api: { open: (id: string) => void; close: () => void } = {
      open() {},
      close() {},
    };
    const setup = await testRender(
      <DialogProvider>
        <Harness
          onReady={(next) => {
            api = next;
          }}
        />
      </DialogProvider>,
      { width: 40, height: 12 },
    );

    try {
      act(() => {
        api.open("models");
      });
      await setup.renderOnce();
      expect(setup.captureCharFrame()).toContain("Modelo");

      act(() => {
        api.close();
      });
      await setup.renderOnce();
      expect(setup.captureCharFrame()).not.toContain("Modelo");
    } finally {
      setup.renderer.destroy();
    }
  });
});

describe("/models", () => {
  test("abre el diálogo models", () => {
    const command = COMMANDS.find((item) => item.name === "models");
    if (!command?.action) throw new Error("/models sin action");

    const seen = { id: "" };
    command.action({
      exit() {},
      newSession() {},
      logout() {},
      toast() {},
      dialog: {
        open(id) {
          seen.id = id;
        },
        close() {},
      },
    });

    expect(seen.id).toBe("models");
  });
});

describe("ModelsDialog", () => {
  test("lista modelos con provider visible", async () => {
    const setup = await testRender(
      <ModelsDialog
        currentProvider="cursor"
        currentModel="auto"
        onClose={() => {}}
        onSelect={() => {}}
      />,
      { width: 50, height: 12 },
    );

    try {
      await act(async () => {
        await setup.renderOnce();
      });
      const frame = setup.captureCharFrame();
      expect(frame).toContain("cursor · auto");
      expect(frame).toContain("local · eco");
    } finally {
      setup.renderer.destroy();
    }
  });
});

describe("/connect", () => {
  test("abre el diálogo connect", () => {
    const command = COMMANDS.find((item) => item.name === "connect");
    if (!command?.action) throw new Error("/connect sin action");

    const seen = { id: "" };
    command.action({
      exit() {},
      newSession() {},
      logout() {},
      toast() {},
      dialog: {
        open(id) {
          seen.id = id;
        },
        close() {},
      },
    });

    expect(seen.id).toBe("connect");
  });
});
