import { TextareaRenderable, type Renderable } from "@opentui/core";
import { KeyCodes, type TestRendererSetup } from "@opentui/core/testing";
import { testRender } from "@opentui/react/test-utils";
import { describe, expect, test } from "bun:test";
import { act } from "react";
import { ToastProvider } from "../../../lib/providers/Toast";
import type { Credentials } from "../api/credentials.ts";
import { LoginScreen, REVEAL_PASSWORD_HINT } from "../ui/LoginScreen";

const PASSWORD = "secret123";
const MASK = "•••••••••";

type AuthApiStub = {
  signIn: (email: string, password: string, apiUrl?: string) => Promise<Credentials>;
  signUp: (
    input: { name: string; email: string; password: string },
    apiUrl?: string,
  ) => Promise<Credentials>;
};

function walk(node: Renderable, acc: Renderable[] = []): Renderable[] {
  acc.push(node);
  for (const child of node.getChildren()) {
    walk(child, acc);
  }
  return acc;
}

function findField(root: Renderable, placeholder: string): TextareaRenderable {
  const field = walk(root).find(
    (node): node is TextareaRenderable =>
      node instanceof TextareaRenderable && node.placeholder === placeholder,
  );
  if (!field) throw new Error(`field not found: ${placeholder}`);
  return field;
}

async function mountLoginScreen(authApi?: AuthApiStub) {
  const setup = await testRender(
    <ToastProvider>
      <box flexDirection="column" width="100%" height="100%">
        <LoginScreen onSuccess={() => {}} onExit={() => {}} authApi={authApi} />
      </box>
    </ToastProvider>,
    { width: 100, height: 28, exitOnCtrlC: false },
  );

  await act(async () => {
    await setup.renderOnce();
  });

  return setup;
}

/** Tab moves React focus email → password (same as real usage). */
async function focusPasswordViaTab(setup: TestRendererSetup) {
  await act(async () => {
    setup.mockInput.pressTab();
    await setup.flush();
  });
}

async function typePassword(setup: TestRendererSetup, text: string) {
  await act(async () => {
    await setup.mockInput.typeText(text);
    await setup.flush();
  });
}

async function pressF2(setup: TestRendererSetup) {
  await act(async () => {
    setup.mockInput.pressKey(KeyCodes.F2);
    await setup.flush();
  });
}

async function typeEmail(setup: TestRendererSetup, text: string) {
  await act(async () => {
    findField(setup.renderer.root, "tu@email.com").focus();
    await setup.mockInput.typeText(text);
    await setup.flush();
  });
}

describe("LoginScreen password masking", () => {
  test("muestra el hint de revelar contraseña", async () => {
    const setup = await mountLoginScreen();
    try {
      expect(setup.captureCharFrame()).toContain(REVEAL_PASSWORD_HINT);
    } finally {
      setup.renderer.destroy();
    }
  });

  test("la ayuda corta queda más centrada que la línea larga", async () => {
    const setup = await mountLoginScreen();
    try {
      const lines = setup.captureCharFrame().split("\n");
      const longLine = lines.find((line) => line.includes("Tab campos"));
      const shortLine = lines.find((line) => line.includes("Ctrl+C dos veces sale"));
      expect(longLine).toBeDefined();
      expect(shortLine).toBeDefined();

      const longStart = longLine!.indexOf("Tab campos");
      const shortStart = shortLine!.indexOf("Ctrl+C");
      expect(shortStart).toBeGreaterThan(longStart);
    } finally {
      setup.renderer.destroy();
    }
  });

  test("al escribir, el frame muestra máscara y no el texto", async () => {
    const setup = await mountLoginScreen();
    try {
      await focusPasswordViaTab(setup);
      await typePassword(setup, PASSWORD);

      const frame = setup.captureCharFrame();
      expect(frame).toContain(MASK);
      expect(frame).not.toContain(PASSWORD);
    } finally {
      setup.renderer.destroy();
    }
  });

  test("F2 alterna show/hide/show/hide sin corromper el secreto", async () => {
    const setup = await mountLoginScreen();
    try {
      await focusPasswordViaTab(setup);
      await typePassword(setup, PASSWORD);

      await pressF2(setup);
      expect(setup.captureCharFrame()).toContain(PASSWORD);
      expect(setup.captureCharFrame()).not.toContain(MASK);

      await pressF2(setup);
      expect(setup.captureCharFrame()).toContain(MASK);
      expect(setup.captureCharFrame()).not.toContain(PASSWORD);

      await pressF2(setup);
      expect(setup.captureCharFrame()).toContain(PASSWORD);
      expect(setup.captureCharFrame()).not.toContain(MASK);

      await pressF2(setup);
      expect(setup.captureCharFrame()).toContain(MASK);
      expect(setup.captureCharFrame()).not.toContain(PASSWORD);
    } finally {
      setup.renderer.destroy();
    }
  });

  test("tras varios toggles, signIn recibe el password real", async () => {
    let capturedPassword = "";
    const setup = await mountLoginScreen({
      signIn: async (_email, password) => {
        capturedPassword = password;
        return {
          apiUrl: "http://localhost:28001",
          sessionToken: "tok",
          email: "a@b.com",
        };
      },
      signUp: async () => {
        throw new Error("no usar");
      },
    });

    try {
      await typeEmail(setup, "a@b.com");
      await focusPasswordViaTab(setup);
      await typePassword(setup, PASSWORD);

      await pressF2(setup);
      await pressF2(setup);
      await pressF2(setup);
      await pressF2(setup);

      await act(async () => {
        setup.mockInput.pressEnter();
        await setup.flush();
      });
      await act(async () => {
        await Bun.sleep(20);
        await setup.flush();
      });

      expect(capturedPassword).toBe(PASSWORD);
    } finally {
      setup.renderer.destroy();
    }
  });
});
