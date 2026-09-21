import { describe, expect, test } from "bun:test";
import type { Turn } from "../../session/store";
import { resolvePendingTurn } from "./ChatPane";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("resolvePendingTurn", () => {
  test("sin formData no hay pending", () => {
    expect(resolvePendingTurn(undefined, [])).toBeNull();
  });

  test("muestra pending mientras el envío está en vuelo", () => {
    expect(
      resolvePendingTurn(form({ text: "hola", mode: "plan", clientMessageId: "cid-1" }), []),
    ).toEqual({ text: "hola", mode: "plan" });
  });

  test("oculta pending si turns ya tienen el mismo clientMessageId", () => {
    const turns: Turn[] = [
      {
        id: "m1",
        role: "user",
        text: "hola",
        mode: "plan",
        clientMessageId: "cid-1",
      },
    ];
    expect(
      resolvePendingTurn(
        form({ text: "hola", mode: "plan", clientMessageId: "cid-1" }),
        turns,
      ),
    ).toBeNull();
  });

  test("oculta pending si el último user turn coincide en text+mode", () => {
    const turns: Turn[] = [
      { id: "m1", role: "user", text: "hola", mode: "plan", clientMessageId: null },
    ];
    expect(
      resolvePendingTurn(
        form({ text: "hola", mode: "plan", clientMessageId: "cid-new" }),
        turns,
      ),
    ).toBeNull();
  });

  test("no oculta pending si el último user es distinto (mismo texto dos veces)", () => {
    const turns: Turn[] = [
      {
        id: "m1",
        role: "user",
        text: "hola",
        mode: "plan",
        clientMessageId: "cid-1",
      },
      {
        id: "m2",
        role: "assistant",
        text: "ok",
        toolCalls: [],
        model: "auto",
        provider: null,
        status: "done",
      },
    ];
    expect(
      resolvePendingTurn(
        form({ text: "hola", mode: "plan", clientMessageId: "cid-2" }),
        turns,
      ),
    ).toEqual({ text: "hola", mode: "plan" });
  });
});
