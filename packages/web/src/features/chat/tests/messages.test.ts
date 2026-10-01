import { describe, expect, test } from "bun:test";
import type { ChatMessageDto } from "@chavez-harness/shared";
import { blocksFromParts, mergeMessages, optimisticUserMessage, textFromParts } from "../state/messages";

function message(seq: number, id = `m${seq}`): ChatMessageDto {
  return {
    id,
    chatSessionId: "s",
    role: "assistant",
    mode: "plan",
    provider: "local",
    model: "eco",
    status: "done",
    error: null,
    parts: [{ type: "text", text: `msg ${seq}` }],
    usage: null,
    clientMessageId: null,
    seq,
    createdAt: new Date(0).toISOString(),
  };
}

describe("blocksFromParts", () => {
  test("mantiene el orden y une texto consecutivo", () => {
    const blocks = blocksFromParts([
      { type: "reasoning", text: "pienso" },
      { type: "text", text: "Voy a " },
      { type: "text", text: "leer." },
      { type: "tool-call", id: "tc1", name: "read", args: { path: "a.ts" }, result: "ok" },
      { type: "text", text: "Listo" },
    ]);
    expect(blocks.map((b) => b.kind)).toEqual(["reasoning", "text", "tool", "text"]);
    expect(blocks[1]).toMatchObject({ kind: "text", text: "Voy a leer." });
  });

  test("descarta razonamiento y texto vacíos", () => {
    expect(
      blocksFromParts([
        { type: "reasoning", text: "  " },
        { type: "text", text: "" },
        { type: "text", text: "\n" },
      ]),
    ).toEqual([]);
  });
});

describe("textFromParts", () => {
  test("solo partes de texto", () => {
    expect(
      textFromParts([
        { type: "text", text: "hola" },
        { type: "tool-call", id: "x", name: "ls", args: {} },
        { type: "text", text: "mundo" },
      ]),
    ).toBe("hola\nmundo");
  });
});

describe("mergeMessages", () => {
  test("reemplaza por id y ordena por seq", () => {
    const merged = mergeMessages([message(2), message(1)], [message(3), { ...message(2), status: "error" }]);
    expect(merged.map((m) => m.seq)).toEqual([1, 2, 3]);
    expect(merged[1]?.status).toBe("error");
  });

  test("el optimista queda al final hasta que llega el real", () => {
    const optimistic = optimisticUserMessage("s", "hola", "build", "cm-1");
    const merged = mergeMessages([message(1), optimistic], [message(2)]);
    expect(merged.at(-1)?.id).toBe("optimistic-cm-1");
    expect(optimistic.mode).toBe("build");
  });
});
