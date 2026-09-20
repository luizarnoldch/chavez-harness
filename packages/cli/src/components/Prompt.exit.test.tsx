import { BoxRenderable, RGBA, TextareaRenderable, type Renderable } from "@opentui/core";
import type { TestRendererSetup } from "@opentui/core/testing";
import { testRender } from "@opentui/react/test-utils";
import { describe, expect, test } from "bun:test";
import { act } from "react";
import { Prompt } from "./Prompt";

const EXIT_BORDER = RGBA.fromHex("#e0af68");
const NORMAL_PLACEHOLDER = "Escribe un mensaje o /comando...";
const EXIT_PLACEHOLDER = "Pulsa Ctrl+C otra vez para salir";

function walk(node: Renderable, acc: Renderable[] = []): Renderable[] {
  acc.push(node);
  for (const child of node.getChildren()) {
    walk(child, acc);
  }
  return acc;
}

async function mountPrompt() {
  let exits = 0;
  const setup = await testRender(
    <box flexDirection="column" width="100%" height="100%">
      <Prompt
        commandContext={{
          exit() {
            exits += 1;
          },
          newSession() {},
          logout() {},
          toast() {},
          dialog: { open() {}, close() {} },
        }}
        selectedCommandIndex={0}
        onSelectedCommandIndexChange={() => {}}
        onValueChange={() => {}}
        onSend={() => {}}
      />
    </box>,
    { width: 80, height: 12, exitOnCtrlC: false },
  );

  const textarea = walk(setup.renderer.root).find(
    (node): node is TextareaRenderable => node instanceof TextareaRenderable,
  );
  if (!textarea) throw new Error("textarea not found");

  const promptBox = textarea.parent;
  if (!(promptBox instanceof BoxRenderable)) throw new Error("prompt box not found");

  return {
    setup,
    textarea,
    promptBox,
    exitCount: () => exits,
  };
}

async function pressCtrlC(setup: TestRendererSetup) {
  await act(async () => {
    setup.mockInput.pressCtrlC();
    await setup.renderOnce();
  });
}

describe("prompt Ctrl+C exit confirmation", () => {
  test("empty input asks before exiting", async () => {
    const { setup, textarea, promptBox, exitCount } = await mountPrompt();

    try {
      await pressCtrlC(setup);

      expect(exitCount()).toBe(0);
      expect(textarea.placeholder).toBe(EXIT_PLACEHOLDER);
      expect(promptBox.borderColor.equals(EXIT_BORDER)).toBe(true);

      await pressCtrlC(setup);

      expect(exitCount()).toBe(1);
    } finally {
      setup.renderer.destroy();
    }
  });

  test("another key cancels the confirmation", async () => {
    const { setup, textarea, exitCount } = await mountPrompt();

    try {
      await pressCtrlC(setup);
      expect(textarea.placeholder).toBe(EXIT_PLACEHOLDER);

      await act(async () => {
        setup.mockInput.pressArrow("right");
        await setup.renderOnce();
      });

      expect(textarea.placeholder).toBe(NORMAL_PLACEHOLDER);
      expect(exitCount()).toBe(0);

      await pressCtrlC(setup);

      expect(exitCount()).toBe(0);
      expect(textarea.placeholder).toBe(EXIT_PLACEHOLDER);
    } finally {
      setup.renderer.destroy();
    }
  });

  test("text is cleared without asking to exit", async () => {
    const { setup, textarea, exitCount } = await mountPrompt();

    try {
      await act(async () => {
        await setup.mockInput.typeText("hola");
        await setup.renderOnce();
      });

      await pressCtrlC(setup);

      expect(textarea.plainText).toBe("");
      expect(exitCount()).toBe(0);
      expect(textarea.placeholder).toBe(NORMAL_PLACEHOLDER);
    } finally {
      setup.renderer.destroy();
    }
  });
});
