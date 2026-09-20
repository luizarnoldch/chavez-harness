import { useKeyboard } from "@opentui/react";
import { matchesShortcut } from "../registry/match";
import { getShortcut } from "../registry/shortcuts";

type ModelsDialogProps = {
  onClose: () => void;
};

export function ModelsDialog({ onClose }: ModelsDialogProps) {
  useKeyboard((key) => {
    if (!matchesShortcut(key, getShortcut("focus-prompt"))) return;
    key.preventDefault();
    onClose();
  });

  return (
    <box border borderColor="#414868" title="Modelo" paddingLeft={1} paddingRight={1} height={3}>
      <text fg="#888888">La lista llegará por API.</text>
    </box>
  );
}
