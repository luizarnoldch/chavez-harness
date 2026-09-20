import { TextareaRenderable, type Renderable } from "@opentui/core";
import { testRender } from "@opentui/react/test-utils";
import { describe, expect, test } from "bun:test";
import { act } from "react";
import { Prompt } from "./Prompt";

function walk(node: Renderable, acc: Renderable[] = []): Renderable[] {
  acc.push(node);
  for (const child of node.getChildren()) {
    walk(child, acc);
  }
  return acc;
}

async function mountPrompt() {
  const setup = await testRender(
    <box flexDirection="column" width="100%" height="100%">
      <Prompt
        commandContext={{ exit() {}, newSession() {}, toast() {}, dialog: { open() {}, close() {} } }}
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

  return { setup, textarea };
}

async function pressEscape(setup: Awaited<ReturnType<typeof mountPrompt>>["setup"]) {
  await act(async () => {
    setup.mockInput.pressEscape();
    await Bun.sleep(40);
    await setup.renderOnce();
  });
}

describe("prompt Esc focus", () => {
  test("Esc restores focus without clearing text", async () => {
    const { setup, textarea } = await mountPrompt();

    try {
      await act(async () => {
        textarea.setText("hola");
        await setup.renderOnce();
      });

      await act(async () => {
        textarea.blur();
      });
      expect(textarea.focused).toBe(false);

      await pressEscape(setup);

      expect(textarea.focused).toBe(true);
      expect(textarea.plainText).toBe("hola");
    } finally {
      setup.renderer.destroy();
    }
  });

  test("Esc still clears text when the input is focused", async () => {
    const { setup, textarea } = await mountPrompt();

    try {
      await act(async () => {
        textarea.setText("hola");
        await setup.renderOnce();
      });

      expect(textarea.focused).toBe(true);

      await pressEscape(setup);

      expect(textarea.plainText).toBe("");
    } finally {
      setup.renderer.destroy();
    }
  });
});
