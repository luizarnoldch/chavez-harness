import type { ClipboardWriteResult } from "@opentui/core";
import { describe, expect, mock, test } from "bun:test";
import {
  copySelectionToClipboard,
  isClipboardWriteSuccessful,
  type ClipboardWriter,
  type ToastShow,
} from "../copy-selection";

function result(partial: {
  host?: ClipboardWriteResult["host"];
  terminal?: ClipboardWriteResult["terminal"]["status"];
}): ClipboardWriteResult {
  return {
    host: partial.host ?? { status: "not-attempted" },
    terminal: {
      status: partial.terminal ?? "not-attempted",
      capability: "unknown",
    },
  };
}

describe("isClipboardWriteSuccessful", () => {
  test("host written es éxito", () => {
    expect(isClipboardWriteSuccessful(result({ host: { status: "written" } }))).toBe(true);
  });

  test("terminal attempted es éxito", () => {
    expect(isClipboardWriteSuccessful(result({ terminal: "attempted" }))).toBe(true);
  });

  test("ambos fallidos no es éxito", () => {
    expect(
      isClipboardWriteSuccessful(
        result({
          host: { status: "failed", error: new Error("no") },
          terminal: "local-failure",
        }),
      ),
    ).toBe(false);
  });
});

describe("copySelectionToClipboard", () => {
  test("texto vacío no llama writeText", async () => {
    const writeText = mock(() => Promise.resolve(result({ host: { status: "written" } })));
    const show = mock(() => {});
    const clipboard: ClipboardWriter = { writeText };

    await copySelectionToClipboard("   ", clipboard, show as ToastShow);

    expect(writeText).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });

  test("texto válido llama writeText con best-available", async () => {
    const writeText = mock((..._args: Parameters<ClipboardWriter["writeText"]>) =>
      Promise.resolve(result({ host: { status: "written" } })),
    );
    const show = mock(() => {});
    const clipboard: ClipboardWriter = { writeText };

    await copySelectionToClipboard("hola", clipboard, show as ToastShow);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0]?.[0]).toBe("hola");
    expect(writeText.mock.calls[0]?.[1]).toEqual({ destination: "best-available" });
  });

  test("host written muestra toast success", async () => {
    const clipboard: ClipboardWriter = {
      writeText: () => Promise.resolve(result({ host: { status: "written" } })),
    };
    const show = mock(() => {});

    await copySelectionToClipboard("hola", clipboard, show as ToastShow);

    expect(show).toHaveBeenCalledWith("Copiado", "success");
  });

  test("host fallido + terminal attempted muestra toast success", async () => {
    const clipboard: ClipboardWriter = {
      writeText: () =>
        Promise.resolve(
          result({ host: { status: "unsupported" }, terminal: "attempted" }),
        ),
    };
    const show = mock(() => {});

    await copySelectionToClipboard("hola", clipboard, show as ToastShow);

    expect(show).toHaveBeenCalledWith("Copiado", "success");
  });

  test("ambos fallidos muestra toast error", async () => {
    const clipboard: ClipboardWriter = {
      writeText: () =>
        Promise.resolve(
          result({
            host: { status: "failed", error: new Error("no") },
            terminal: "local-failure",
          }),
        ),
    };
    const show = mock(() => {});

    await copySelectionToClipboard("hola", clipboard, show as ToastShow);

    expect(show).toHaveBeenCalledWith("No se pudo copiar", "error");
  });
});
