import { TextareaRenderable, type Renderable } from "@opentui/core";
import { testRender } from "@opentui/react/test-utils";
import { describe, expect, test } from "bun:test";
import { act } from "react";
import { ToastProvider } from "../providers/Toast";
import { LoginScreen } from "./LoginScreen";

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

async function typeInto(
  setup: Awaited<ReturnType<typeof testRender>>,
  field: TextareaRenderable,
  text: string,
) {
  await act(async () => {
    field.focus();
    await setup.mockInput.typeText(text);
    await setup.flush();
  });
}

async function submitPassword(setup: Awaited<ReturnType<typeof testRender>>) {
  await act(async () => {
    setup.mockInput.pressEnter();
    await setup.flush();
  });
  // Auth submit is async; flush again so toast state paints
  await act(async () => {
    await Bun.sleep(20);
    await setup.flush();
  });
}

describe("LoginScreen toast feedback", () => {
  test("validación vacía muestra toast de error", async () => {
    const setup = await testRender(
      <ToastProvider>
        <box flexDirection="column" width="100%" height="100%">
          <LoginScreen onSuccess={() => {}} onExit={() => {}} />
        </box>
      </ToastProvider>,
      { width: 80, height: 24, exitOnCtrlC: false },
    );

    try {
      await act(async () => {
        await setup.renderOnce();
      });

      const password = findField(setup.renderer.root, "••••••••");
      await act(async () => {
        password.focus();
      });
      await submitPassword(setup);

      expect(setup.captureCharFrame()).toContain("Introduce email y contraseña");
    } finally {
      setup.renderer.destroy();
    }
  });

  test("signIn fallido muestra toast de error y no llama onSuccess", async () => {
    let success = 0;
    const setup = await testRender(
      <ToastProvider>
        <box flexDirection="column" width="100%" height="100%">
          <LoginScreen
            onSuccess={() => {
              success += 1;
            }}
            onExit={() => {}}
            authApi={{
              signIn: async () => {
                throw new Error("Credenciales inválidas");
              },
              signUp: async () => {
                throw new Error("no usar");
              },
            }}
          />
        </box>
      </ToastProvider>,
      { width: 80, height: 24, exitOnCtrlC: false },
    );

    try {
      await act(async () => {
        await setup.renderOnce();
      });

      await typeInto(setup, findField(setup.renderer.root, "tu@email.com"), "a@b.com");
      await typeInto(setup, findField(setup.renderer.root, "••••••••"), "secret12");
      await submitPassword(setup);

      expect(setup.captureCharFrame()).toContain("Credenciales inválidas");
      expect(success).toBe(0);
    } finally {
      setup.renderer.destroy();
    }
  });

  test("signIn exitoso muestra toast y llama onSuccess", async () => {
    let success = 0;
    const setup = await testRender(
      <ToastProvider>
        <box flexDirection="column" width="100%" height="100%">
          <LoginScreen
            onSuccess={() => {
              success += 1;
            }}
            onExit={() => {}}
            authApi={{
              signIn: async () => ({
                apiUrl: "http://localhost:28001",
                sessionToken: "tok",
                email: "a@b.com",
              }),
              signUp: async () => {
                throw new Error("no usar");
              },
            }}
          />
        </box>
      </ToastProvider>,
      { width: 80, height: 24, exitOnCtrlC: false },
    );

    try {
      await act(async () => {
        await setup.renderOnce();
      });

      await typeInto(setup, findField(setup.renderer.root, "tu@email.com"), "a@b.com");
      await typeInto(setup, findField(setup.renderer.root, "••••••••"), "secret12");
      await submitPassword(setup);

      expect(setup.captureCharFrame()).toContain("Sesión iniciada");
      expect(success).toBe(1);
    } finally {
      setup.renderer.destroy();
    }
  });
});
