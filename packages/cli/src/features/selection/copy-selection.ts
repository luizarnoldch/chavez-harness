import type { ClipboardService, ClipboardWriteResult } from "@opentui/core";
import type { ToastKind } from "../../lib/types/toast";

export type ToastShow = (message: string, kind: ToastKind) => void;

export type ClipboardWriter = Pick<ClipboardService, "writeText">;

export function isClipboardWriteSuccessful(result: ClipboardWriteResult): boolean {
  return result.host.status === "written" || result.terminal.status === "attempted";
}

export async function copySelectionToClipboard(
  text: string,
  clipboard: ClipboardWriter,
  show: ToastShow,
): Promise<void> {
  if (text.trim() === "") return;

  const result = await clipboard.writeText(text, { destination: "best-available" });
  if (isClipboardWriteSuccessful(result)) {
    show("Copiado", "success");
    return;
  }
  show("No se pudo copiar", "error");
}
