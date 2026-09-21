import { testRender } from "@opentui/react/test-utils";
import { describe, expect, test } from "bun:test";
import { act } from "react";
import {
  summarizeToolCall,
  ToolCallRow,
  looksLikeUnifiedDiff,
} from "../pane/ToolCallRow";

describe("summarizeToolCall", () => {
  test("resume path/pattern/command", () => {
    expect(summarizeToolCall({ name: "read", args: { path: "a/b.ts" } })).toBe(
      "Read a/b.ts",
    );
    expect(
      summarizeToolCall({ name: "grep", args: { pattern: "foo", path: "src" } }),
    ).toBe("Grep foo in src");
    expect(
      summarizeToolCall({ name: "shell", args: { command: "bun test" } }),
    ).toBe("Shell bun test");
  });
});

describe("looksLikeUnifiedDiff", () => {
  test("detects unified diff markers", () => {
    expect(looksLikeUnifiedDiff("@@ -1 +1 @@\n-a\n+b")).toBe(true);
    expect(looksLikeUnifiedDiff("hola mundo")).toBe(false);
  });
});

describe("ToolCallRow", () => {
  test("muestra glyph y resumen compacto", async () => {
    const setup = await testRender(
      <ToolCallRow
        tool={{
          id: "1",
          name: "read",
          status: "running",
          args: { path: "packages/cli/src/foo.ts" },
        }}
      />,
      { width: 80, height: 4 },
    );

    try {
      await act(async () => {
        await setup.renderOnce();
      });
      const frame = setup.captureCharFrame();
      expect(frame).toContain("◐");
      expect(frame).toContain("Read");
      expect(frame).toContain("foo.ts");
    } finally {
      setup.renderer.destroy();
    }
  });

  test("completed muestra check", async () => {
    const setup = await testRender(
      <ToolCallRow
        tool={{
          id: "2",
          name: "grep",
          status: "completed",
          args: { pattern: "toolCall" },
          result: "ok",
        }}
      />,
      { width: 80, height: 4 },
    );

    try {
      await act(async () => {
        await setup.renderOnce();
      });
      const frame = setup.captureCharFrame();
      expect(frame).toContain("✔");
      expect(frame).toContain("Grep");
    } finally {
      setup.renderer.destroy();
    }
  });
});
