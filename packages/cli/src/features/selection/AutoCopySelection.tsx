import { useSelectionHandler } from "@opentui/react";
import { clipboard } from "../../app/clipboard";
import { useToast } from "../../lib/providers/Toast";
import { copySelectionToClipboard } from "./copy-selection";

export function AutoCopySelection() {
  const { show } = useToast();

  useSelectionHandler((selection) => {
    if (selection.isDragging) return;
    const text = selection.getSelectedText();
    void copySelectionToClipboard(text, clipboard, show);
  });

  return null;
}
