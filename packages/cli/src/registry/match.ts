import type { KeyEvent } from "@opentui/core";
import type { Shortcut, ShortcutChord } from "./shortcuts";

function chordMatches(key: KeyEvent, chord: ShortcutChord): boolean {
  if (key.name !== chord.name) return false;
  if (Boolean(key.ctrl) !== Boolean(chord.ctrl)) return false;
  if (Boolean(key.shift) !== Boolean(chord.shift)) return false;
  if (Boolean(key.meta) !== Boolean(chord.meta)) return false;
  return true;
}

export function matchesShortcut(key: KeyEvent, shortcut: Shortcut): boolean {
  return shortcut.keys.some((chord) => chordMatches(key, chord));
}
