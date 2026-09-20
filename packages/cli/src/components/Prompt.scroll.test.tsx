import { BoxRenderable, RGBA, TextareaRenderable, type Renderable } from "@opentui/core";
import { testRender } from "@opentui/react/test-utils";
import { describe, expect, test } from "bun:test";
import { act } from "react";
import { Prompt } from "./Prompt";

const THUMB = RGBA.fromHex("#7aa2f7");
const LINE_COUNT = 30;

function walk(node: Renderable, acc: Renderable[] = []): Renderable[] {
  acc.push(node);
  for (const child of node.getChildren()) {
    walk(child, acc);
  }
  return acc;
}

function expectedThumbTop(lineCount: number, scrollY: number, visibleRows: number): number {
  const trackHeight = Math.max(visibleRows, 1);
  const thumbSize = Math.max(1, Math.round((visibleRows / lineCount) * trackHeight));
  const maxScroll = Math.max(lineCount - visibleRows, 1);
  const maxThumbTop = Math.max(trackHeight - thumbSize, 0);
  return Math.round((scrollY / maxScroll) * maxThumbTop);
}

function thumbTop(track: Renderable): number {
  return track.getChildren().findIndex((row) => {
    return row instanceof BoxRenderable && row.backgroundColor.equals(THUMB);
  });
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
    { width: 50, height: 24 },
  );

  const lines = Array.from({ length: LINE_COUNT }, (_, index) => {
    return `Line ${String(index).padStart(2, "0")}`;
  }).join("\n");

  await act(async () => {
    await setup.mockInput.pasteBracketedText(lines);
    await setup.renderOnce();
  });

  const textarea = walk(setup.renderer.root).find(
    (node): node is TextareaRenderable => node instanceof TextareaRenderable,
  );
  if (!textarea) throw new Error("textarea not found");

  const track = textarea.parent?.getChildren().find((child) => child !== textarea && child.width === 1);
  if (!track) throw new Error("scrollbar track not found");

  return { setup, textarea, track };
}

describe("prompt wheel scroll", () => {
  test("wheel over the text moves the viewport and the thumb", async () => {
    const { setup, textarea, track } = await mountPrompt();

    try {
      const before = textarea.scrollY;
      expect(before).toBeGreaterThan(0);

      await act(async () => {
        for (let i = 0; i < 4; i++) {
          await setup.mockMouse.scroll(textarea.x + 2, textarea.y, "up");
        }
        await setup.renderOnce();
      });

      expect(textarea.scrollY).toBeLessThan(before);
      expect(thumbTop(track)).toBe(
        expectedThumbTop(textarea.lineCount, textarea.scrollY, textarea.height),
      );
    } finally {
      await act(async () => {
        setup.renderer.destroy();
      });
    }
  });

  test("wheel over the scrollbar track scrolls the textarea", async () => {
    const { setup, textarea, track } = await mountPrompt();

    try {
      const before = textarea.scrollY;
      expect(before).toBeGreaterThan(0);
      expect(setup.renderer.hitTest(track.x, track.y)).not.toBe(textarea.num);

      await act(async () => {
        for (let i = 0; i < 4; i++) {
          await setup.mockMouse.scroll(track.x, track.y, "up");
        }
        await setup.renderOnce();
      });

      expect(textarea.scrollY).toBe(before - 4);
      expect(thumbTop(track)).toBe(
        expectedThumbTop(textarea.lineCount, textarea.scrollY, textarea.height),
      );
    } finally {
      await act(async () => {
        setup.renderer.destroy();
      });
    }
  });

  test("arrow up still keeps the thumb aligned after a wheel scroll", async () => {
    const { setup, textarea, track } = await mountPrompt();

    try {
      await act(async () => {
        for (let i = 0; i < 4; i++) {
          await setup.mockMouse.scroll(textarea.x + 2, textarea.y, "up");
        }
        setup.mockInput.pressArrow("up");
        await setup.renderOnce();
      });

      const maxScroll = Math.max(textarea.lineCount - textarea.height, 0);
      expect(textarea.scrollY).toBeGreaterThanOrEqual(0);
      expect(textarea.scrollY).toBeLessThanOrEqual(maxScroll);
      expect(thumbTop(track)).toBe(
        expectedThumbTop(textarea.lineCount, textarea.scrollY, textarea.height),
      );
    } finally {
      await act(async () => {
        setup.renderer.destroy();
      });
    }
  });
});
