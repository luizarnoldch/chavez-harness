import { RGBA, TextRenderable, type Renderable } from "@opentui/core";
import { testRender } from "@opentui/react/test-utils";
import { describe, expect, test } from "bun:test";
import { act, useEffect } from "react";
import { Toast } from "../components/Toast";
import { COMMANDS } from "../registry/commands";
import { ToastProvider, useToast, type ToastKind } from "./Toast";

const INFO = RGBA.fromHex("#7aa2f7");

function walk(node: Renderable, acc: Renderable[] = []): Renderable[] {
  acc.push(node);
  for (const child of node.getChildren()) {
    walk(child, acc);
  }
  return acc;
}

function Probe({
  onShow,
}: {
  onShow: (show: (message: string, kind: ToastKind) => void) => void;
}) {
  const { show } = useToast();
  useEffect(() => {
    onShow(show);
  }, [onShow, show]);
  return <Toast />;
}

describe("toast", () => {
  test("show pinta el texto y un segundo show cambia tipo y color", async () => {
    let show: (message: string, kind: ToastKind) => void = () => {};
    const setup = await testRender(
      <ToastProvider>
        <Probe
          onShow={(next) => {
            show = next;
          }}
        />
      </ToastProvider>,
      { width: 40, height: 4 },
    );

    try {
      act(() => {
        show("Primero", "success");
      });
      await setup.renderOnce();
      expect(setup.captureCharFrame()).toContain("Primero");

      act(() => {
        show("Segundo", "info");
      });
      await setup.renderOnce();
      const frame = setup.captureCharFrame();
      expect(frame).toContain("Segundo");
      expect(frame).not.toContain("Primero");

      const text = walk(setup.renderer.root).find(
        (node): node is TextRenderable => node instanceof TextRenderable,
      );
      if (!text) throw new Error("text not found");
      expect(text.fg.equals(INFO)).toBe(true);
    } finally {
      setup.renderer.destroy();
    }
  });
});

describe("/new", () => {
  test("limpia y avisa success", () => {
    const command = COMMANDS.find((item) => item.name === "new");
    if (!command?.action) throw new Error("/new sin action");

    const seen = {
      started: false,
      message: "",
      kind: null as ToastKind | null,
    };
    command.action({
      exit() {},
      newSession() {
        seen.started = true;
      },
      toast(message, kind) {
        seen.message = message;
        seen.kind = kind;
      },
      logout() {},
      dialog: { open() {}, close() {} },
    });

    expect(seen.started).toBe(true);
    expect(seen.message).toBe("Conversación reiniciada");
    expect(seen.kind).toBe("success");
  });
});
