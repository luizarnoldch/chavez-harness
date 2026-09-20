import { TextareaRenderable, type Renderable } from "@opentui/core";
import type { TestRendererSetup } from "@opentui/core/testing";
import { testRender } from "@opentui/react/test-utils";
import { describe, expect, test } from "bun:test";
import { act } from "react";
import { ToastProvider } from "../../../lib/providers/Toast";
import { EXIT_HINT, LoginScreen } from "../ui/LoginScreen";

function walk(node: Renderable, acc: Renderable[] = []): Renderable[] {
  acc.push(node);
  for (const child of node.getChildren()) {
    walk(child, acc);
  }
  return acc;
}

async function mountLoginScreen() {
  let exits = 0;
  const setup = await testRender(
    <ToastProvider>
      <box flexDirection="column" width="100%" height="100%">
        <LoginScreen
          onSuccess={() => {}}
          onExit={() => {
            exits += 1;
          }}
        />
      </box>
    </ToastProvider>,
    { width: 80, height: 24, exitOnCtrlC: false },
  );

  await act(async () => {
    await setup.renderOnce();
  });

  return {
    setup,
    exitCount: () => exits,
    frame: () => setup.captureCharFrame(),
  };
}

async function pressCtrlC(setup: TestRendererSetup) {
  await act(async () => {
    setup.mockInput.pressCtrlC();
  });
  await act(async () => {
    await setup.flush();
  });
}

async function pressChord(setup: TestRendererSetup, key: string, mods: { ctrl?: boolean }) {
  await act(async () => {
    setup.mockInput.pressKey(key, mods);
  });
  await act(async () => {
    await setup.flush();
  });
}

describe("LoginScreen Ctrl+C exit confirmation", () => {
  test("asks before exiting, second Ctrl+C exits", async () => {
    const { setup, exitCount, frame } = await mountLoginScreen();

    try {
      await pressCtrlC(setup);
      expect(exitCount()).toBe(0);
      expect(frame()).toContain(EXIT_HINT);

      await pressCtrlC(setup);
      expect(exitCount()).toBe(1);
    } finally {
      setup.renderer.destroy();
    }
  });

  test("another key cancels the confirmation", async () => {
    const { setup, exitCount, frame } = await mountLoginScreen();

    try {
      await pressCtrlC(setup);
      expect(frame()).toContain(EXIT_HINT);

      await act(async () => {
        setup.mockInput.pressTab();
      });
      await act(async () => {
        await setup.flush();
      });

      expect(frame()).not.toContain(EXIT_HINT);
      expect(exitCount()).toBe(0);

      await pressCtrlC(setup);
      expect(exitCount()).toBe(0);
      expect(frame()).toContain(EXIT_HINT);
    } finally {
      setup.renderer.destroy();
    }
  });
});

describe("LoginScreen auth mode", () => {
  test("Ctrl+R muestra el campo Nombre en registro", async () => {
    const { setup, frame } = await mountLoginScreen();

    try {
      expect(frame()).toContain("Inicia sesión");

      await pressChord(setup, "r", { ctrl: true });

      expect(frame()).toContain("Crea una cuenta");
      expect(frame()).toContain("Nombre");

      const textareas = walk(setup.renderer.root).filter(
        (node): node is TextareaRenderable => node instanceof TextareaRenderable,
      );
      expect(textareas.length).toBe(3);
    } finally {
      setup.renderer.destroy();
    }
  });

  test("Ctrl+R vuelve a login y oculta Nombre", async () => {
    const { setup, frame } = await mountLoginScreen();

    try {
      await pressChord(setup, "r", { ctrl: true });
      expect(frame()).toContain("Nombre");

      await pressChord(setup, "r", { ctrl: true });

      expect(frame()).toContain("Inicia sesión");
      expect(frame()).not.toContain("Nombre");

      const textareas = walk(setup.renderer.root).filter(
        (node): node is TextareaRenderable => node instanceof TextareaRenderable,
      );
      expect(textareas.length).toBe(2);
    } finally {
      setup.renderer.destroy();
    }
  });
});
