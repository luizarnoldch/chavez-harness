import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";
import { MessageList, MessageUsagePanel, compactUsageSummary } from "../pane/MessageList";
import type { Turn } from "../../session/store";

/** Wait until tree-sitter highlight conceals markdown markers. */
async function paint(setup: Awaited<ReturnType<typeof testRender>>) {
  await act(async () => {
    await setup.renderOnce();
  });
  for (let i = 0; i < 30; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    await act(async () => {
      await setup.flush({ maxPasses: 10 });
    });
    await act(async () => {
      await setup.renderOnce();
    });
  }
}

describe("compactUsageSummary", () => {
  test("incluye modelo, tokens y duración", () => {
    expect(
      compactUsageSummary("auto", {
        inputTokens: 100,
        outputTokens: 200,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalTokens: 1200,
        durationMs: 2100,
      }),
    ).toBe("auto · 1.2k tok · 2.1s");
  });

  test("sin usage solo muestra modelo", () => {
    expect(compactUsageSummary("auto", null)).toBe("auto");
  });
});

describe("MessageUsagePanel", () => {
  test("muestra filas de provider tokens y duración", async () => {
    const setup = await testRender(
      <MessageUsagePanel
        provider="cursor"
        model="auto"
        usage={{
          inputTokens: 5,
          outputTokens: 7,
          cacheReadTokens: 1,
          cacheWriteTokens: 2,
          totalTokens: 12,
          durationMs: 1000,
          cost: { rawCostCents: 10, chargedCents: 8 },
        }}
      />,
      { width: 60, height: 16 },
    );

    try {
      await act(async () => {
        await setup.renderOnce();
      });
      const frame = setup.captureCharFrame();
      expect(frame).toContain("Provider");
      expect(frame).toContain("cursor");
      expect(frame).toContain("Input");
      expect(frame).toContain("Output");
      expect(frame).toContain("Duración");
      expect(frame).toContain("Coste");
    } finally {
      setup.renderer.destroy();
    }
  });
});

describe("MessageList metadata", () => {
  test("muestra resumen compacto bajo la respuesta", async () => {
    const turns: Turn[] = [
      {
        id: "u1",
        role: "user",
        text: "hola",
        mode: "plan",
      },
      {
        id: "a1",
        role: "assistant",
        text: "respuesta",
        toolCalls: [],
        model: "auto",
        provider: "cursor",
        status: "done",
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          totalTokens: 30,
          durationMs: 500,
        },
      },
    ];

    const setup = await testRender(<MessageList turns={turns} />, {
      width: 60,
      height: 12,
    });

    try {
      await paint(setup);
      const frame = setup.captureCharFrame();
      expect(frame).toContain("respuesta");
      expect(frame).toContain("▸");
      expect(frame).toContain("auto");
      expect(frame).toContain("30 tok");
    } finally {
      setup.renderer.destroy();
    }
  });

  test("click en el resumen expande Meta", async () => {
    const turns: Turn[] = [
      {
        id: "a1",
        role: "assistant",
        text: "ok",
        toolCalls: [],
        model: "auto",
        provider: "cursor",
        status: "done",
        usage: {
          inputTokens: 5,
          outputTokens: 7,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          totalTokens: 12,
          durationMs: 500,
        },
      },
    ];

    const setup = await testRender(<MessageList turns={turns} />, {
      width: 60,
      height: 20,
      exitOnCtrlC: false,
    });

    try {
      await paint(setup);
      expect(setup.captureCharFrame()).not.toContain("Input");

      await act(async () => {
        await setup.mockMouse.click(1, 1);
      });
      await act(async () => {
        await setup.flush();
      });
      await act(async () => {
        await setup.renderOnce();
      });

      const frame = setup.captureCharFrame();
      expect(frame).toContain("▾");
      expect(frame).toContain("Input");
      expect(frame).toContain("Provider");
    } finally {
      setup.renderer.destroy();
    }
  });

  test("muestra tool row y markdown del asistente", async () => {
    const turns: Turn[] = [
      {
        id: "a1",
        role: "assistant",
        text: "**hola** mundo",
        toolCalls: [
          {
            type: "tool-call",
            id: "tc-1",
            name: "read",
            args: { path: "packages/cli/src/foo.ts" },
            result: "ok",
          },
        ],
        model: "auto",
        provider: "cursor",
        status: "done",
        usage: null,
      },
    ];

    const setup = await testRender(<MessageList turns={turns} />, {
      width: 80,
      height: 16,
    });

    try {
      await paint(setup);
      const frame = setup.captureCharFrame();
      expect(frame).toContain("✔");
      expect(frame).toContain("Read");
      expect(frame).toContain("foo.ts");
      expect(frame).toContain("hola");
      expect(frame).toContain("mundo");
    } finally {
      setup.renderer.destroy();
    }
  });

  test("oculta marcadores de heading y negrita", async () => {
    const turns: Turn[] = [
      {
        id: "a1",
        role: "assistant",
        text: "## Titulo\n\n**hola** mundo",
        toolCalls: [],
        model: "auto",
        provider: "cursor",
        status: "done",
        usage: null,
      },
    ];

    const setup = await testRender(<MessageList turns={turns} />, {
      width: 80,
      height: 16,
    });

    try {
      await paint(setup);
      const frame = setup.captureCharFrame();
      expect(frame).toContain("Titulo");
      expect(frame).toContain("hola");
      expect(frame).not.toContain("##");
      expect(frame).not.toContain("**");
    } finally {
      setup.renderer.destroy();
    }
  });
});
