import type { KeyEvent, MouseEvent, TextareaRenderable } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getFilterCommands } from "../../../lib/filter-commands";
import {
  createPromptHistory,
  pushEntry,
  recallNext,
  recallPrevious,
  resetHistoryIndex,
  type HistoryRecall,
} from "../../../lib/prompt-history";
import { COMMANDS } from "../../../lib/registry/commands";
import { matchesShortcut } from "../../../lib/registry/match";
import { getShortcut, promptTextareaKeyBindings } from "../../../lib/registry/shortcuts";
import type { Command, CommandContext } from "../../../lib/types/commands";

type PromptProps = {
  commandContext: CommandContext;
  selectedCommandIndex: number;
  onSelectedCommandIndexChange: (index: number) => void;
  onValueChange: (value: string) => void;
  onSend: (text: string) => void;
  focused?: boolean;
  busy?: boolean;
};

const promptKeyBindings = promptTextareaKeyBindings();

const BORDER_ROWS = 2;
const MIN_TOTAL_HEIGHT = 3;
const PROMPT_PLACEHOLDER = "Escribe un mensaje o /comando...";
const BUSY_PLACEHOLDER = "Esperando respuesta…";
const EXIT_CONFIRM_PLACEHOLDER = "Pulsa Ctrl+C otra vez para salir";
const PROMPT_BORDER_COLOR = "#414868";
const BUSY_BORDER_COLOR = "#2a2e3f";
const EXIT_CONFIRM_BORDER_COLOR = "#e0af68";

function resolveCommand(text: string, selectedIndex: number): Command | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return undefined;

  const exact = COMMANDS.find(
    (command) =>
      command.value === trimmed || `/${command.name}` === trimmed,
  );
  if (exact) return exact;

  const filtered = getFilterCommands(trimmed.slice(1));
  if (filtered.length === 0) return undefined;
  return filtered[Math.min(selectedIndex, filtered.length - 1)];
}

function scrollViewport(textarea: TextareaRenderable, direction: "up" | "down", delta: number) {
  const viewport = textarea.editorView.getViewport();
  if (direction === "up") {
    const newOffsetY = Math.max(0, viewport.offsetY - delta);
    textarea.editorView.setViewport(viewport.offsetX, newOffsetY, viewport.width, viewport.height, true);
  } else {
    const totalVirtualLines = textarea.editorView.getTotalVirtualLineCount();
    const maxOffsetY = Math.max(0, totalVirtualLines - viewport.height);
    const newOffsetY = Math.min(viewport.offsetY + delta, maxOffsetY);
    textarea.editorView.setViewport(viewport.offsetX, newOffsetY, viewport.width, viewport.height, true);
  }
  textarea.requestRender();
}

function computeBoxHeight(lineCount: number, terminalHeight: number): number {
  const maxTotal = Math.max(MIN_TOTAL_HEIGHT, Math.floor(terminalHeight * 0.25));
  const needed = lineCount + BORDER_ROWS;
  return Math.min(maxTotal, Math.max(MIN_TOTAL_HEIGHT, needed));
}

type ScrollMetrics = {
  lineCount: number;
  scrollY: number;
  visibleRows: number;
};

function PromptScrollbar({ lineCount, scrollY, visibleRows }: ScrollMetrics) {
  if (lineCount <= visibleRows) return null;

  const trackHeight = Math.max(visibleRows, 1);
  const thumbSize = Math.max(1, Math.round((visibleRows / lineCount) * trackHeight));
  const maxScroll = Math.max(lineCount - visibleRows, 1);
  const maxThumbTop = Math.max(trackHeight - thumbSize, 0);
  const thumbTop = Math.round((scrollY / maxScroll) * maxThumbTop);

  return (
    <box width={1} height={trackHeight} backgroundColor="#414868" flexDirection="column">
      {Array.from({ length: trackHeight }, (_, row) => {
        const isThumb = row >= thumbTop && row < thumbTop + thumbSize;
        return (
          <box
            key={row}
            width={1}
            height={1}
            backgroundColor={isThumb ? "#7aa2f7" : "#414868"}
          />
        );
      })}
    </box>
  );
}

export function Prompt({
  commandContext,
  selectedCommandIndex,
  onSelectedCommandIndexChange,
  onValueChange,
  onSend,
  focused = true,
  busy = false,
}: PromptProps) {
  const { height: terminalHeight } = useTerminalDimensions();
  const textareaRef = useRef<TextareaRenderable>(null);
  const historyRef = useRef(createPromptHistory());
  const clearSnapshotRef = useRef<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);

  const [boxHeight, setBoxHeight] = useState(() =>
    computeBoxHeight(1, terminalHeight),
  );
  const [scrollMetrics, setScrollMetrics] = useState<ScrollMetrics>({
    lineCount: 1,
    scrollY: 0,
    visibleRows: Math.max(boxHeight - BORDER_ROWS, 1),
  });

  const syncLayout = useCallback(() => {
    try {
      const textarea = textareaRef.current;
      const lineCount = Math.max(textarea?.lineCount ?? 1, 1);
      const nextHeight = computeBoxHeight(lineCount, terminalHeight);
      const visibleRows = Math.max(nextHeight - BORDER_ROWS, 1);
      setBoxHeight(nextHeight);
      setScrollMetrics({
        lineCount,
        scrollY: textarea?.scrollY ?? 0,
        visibleRows,
      });
    } catch {
      // EditBuffer may already be destroyed during shutdown (/exit, Ctrl+C).
    }
  }, [terminalHeight]);

  useEffect(() => {
    syncLayout();
  }, [syncLayout]);

  useKeyboard((key) => {
    const textarea = textareaRef.current;
    if (!textarea || textarea.focused) return;
    if (!matchesShortcut(key, getShortcut("focus-prompt"))) return;
    key.preventDefault();
    textarea.focus();
  });

  const resetCtrlCState = () => {
    clearSnapshotRef.current = null;
    setConfirmExit(false);
  };

  const clearInputText = () => {
    const current = textareaRef.current?.plainText ?? "";
    if (current.length === 0) return false;

    clearSnapshotRef.current = current;
    historyRef.current = resetHistoryIndex(historyRef.current);
    try {
      textareaRef.current?.clear();
    } catch {
      // EditBuffer may already be destroyed during shutdown.
    }
    onValueChange("");
    onSelectedCommandIndexChange(0);
    syncLayout();
    return true;
  };

  const rememberSubmit = (text: string) => {
    historyRef.current = pushEntry(historyRef.current, text);
  };

  const applyRecall = (recall: HistoryRecall) => {
    historyRef.current = recall.history;
    const textarea = textareaRef.current;
    textarea?.setText(recall.text);
    if (textarea) {
      textarea.cursorOffset = recall.cursor === "start" ? 0 : recall.text.length;
    }
    onValueChange(recall.text);
    syncLayout();
  };

  const handleSubmit = () => {
    const text = textareaRef.current?.plainText.trim() ?? "";
    if (!text) return;

    const command = resolveCommand(text, selectedCommandIndex);
    if (command) {
      rememberSubmit(text);
      if (command.name === "exit") {
        void command.action?.(commandContext);
        return;
      }
      void command.action?.(commandContext);
      try {
        textareaRef.current?.clear();
      } catch {
        // Buffer may already be gone if the action tore down the renderer.
      }
      onValueChange("");
      onSelectedCommandIndexChange(0);
      resetCtrlCState();
      syncLayout();
      return;
    }

    if (text.startsWith("/")) {
      return;
    }

    if (busy) return;

    onSend(text);
    rememberSubmit(text);
    try {
      textareaRef.current?.clear();
    } catch {
      // EditBuffer may already be destroyed during shutdown.
    }
    onValueChange("");
    resetCtrlCState();
    syncLayout();
  };

  const handleKeyDown = (key: KeyEvent) => {
    const isExitChord = matchesShortcut(key, getShortcut("clear-or-exit"));

    if (confirmExit && !isExitChord) {
      setConfirmExit(false);
    }

    if (isExitChord) {
      key.preventDefault();
      key.stopPropagation();

      if (clearInputText()) {
        if (confirmExit) setConfirmExit(false);
        return;
      }

      if (confirmExit) {
        commandContext.exit();
        return;
      }

      setConfirmExit(true);
      return;
    }

    if (matchesShortcut(key, getShortcut("clear-input"))) {
      key.preventDefault();
      key.stopPropagation();
      clearInputText();
      return;
    }

    if (matchesShortcut(key, getShortcut("restore-input"))) {
      key.preventDefault();
      key.stopPropagation();

      const snapshot = clearSnapshotRef.current;
      if (snapshot == null) return;

      textareaRef.current?.setText(snapshot);
      onValueChange(snapshot);
      clearSnapshotRef.current = null;
      syncLayout();
      return;
    }

    queueMicrotask(syncLayout);

    const textarea = textareaRef.current;
    const text = textarea?.plainText ?? "";
    const filtered = text.startsWith("/")
      ? getFilterCommands(text.trim().slice(1))
      : [];

    if (filtered.length > 0) {
      if (matchesShortcut(key, getShortcut("command-prev"))) {
        key.preventDefault();
        onSelectedCommandIndexChange(
          (selectedCommandIndex - 1 + filtered.length) % filtered.length,
        );
        return;
      }

      if (matchesShortcut(key, getShortcut("command-next"))) {
        key.preventDefault();
        onSelectedCommandIndexChange(
          (selectedCommandIndex + 1) % filtered.length,
        );
      }
      return;
    }

    const offset = textarea?.logicalCursor.offset ?? 0;
    const atStart = text.length === 0 || offset === 0;
    const atEnd = text.length > 0 && offset === text.length;

    if (matchesShortcut(key, getShortcut("command-prev")) && atStart) {
      const recall = recallPrevious(historyRef.current, text);
      if (!recall) return;
      key.preventDefault();
      applyRecall(recall);
      return;
    }

    if (matchesShortcut(key, getShortcut("command-next")) && atEnd) {
      const recall = recallNext(historyRef.current, text);
      if (!recall) return;
      key.preventDefault();
      applyRecall(recall);
    }
  };

  const handleMouseScroll = (event: MouseEvent) => {
    const textarea = textareaRef.current;
    const scroll = event.scroll;
    if (!textarea || !scroll) return;
    if (scroll.direction !== "up" && scroll.direction !== "down") return;

    if (event.target !== textarea) {
      scrollViewport(textarea, scroll.direction, scroll.delta);
    }
    syncLayout();
  };

  return (
    <box
      height={boxHeight}
      border
      borderColor={
        confirmExit ? EXIT_CONFIRM_BORDER_COLOR : busy ? BUSY_BORDER_COLOR : PROMPT_BORDER_COLOR
      }
      paddingLeft={1}
      flexDirection="row"
      onMouseScroll={handleMouseScroll}
    >
      <textarea
        ref={textareaRef}
        focused={focused}
        flexGrow={1}
        placeholder={
          confirmExit ? EXIT_CONFIRM_PLACEHOLDER : busy ? BUSY_PLACEHOLDER : PROMPT_PLACEHOLDER
        }
        keyBindings={promptKeyBindings}
        onSubmit={handleSubmit}
        onContentChange={() => {
          const value = textareaRef.current?.plainText ?? "";
          onValueChange(value);
          onSelectedCommandIndexChange(0);
          if (value.length > 0 && confirmExit) {
            setConfirmExit(false);
          }
          syncLayout();
        }}
        onCursorChange={() => {
          syncLayout();
        }}
        onKeyDown={handleKeyDown}
      />
      <PromptScrollbar {...scrollMetrics} />
    </box>
  );
}
