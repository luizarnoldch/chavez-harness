export type PromptHistory = {
  entries: string[];
  index: number | null;
  draft: string;
};

export type HistoryRecall = {
  history: PromptHistory;
  text: string;
  cursor: "start" | "end";
};

export function createPromptHistory(): PromptHistory {
  return { entries: [], index: null, draft: "" };
}

export function pushEntry(history: PromptHistory, text: string): PromptHistory {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ...history, index: null, draft: "" };
  }
  return {
    entries: [...history.entries, trimmed],
    index: null,
    draft: "",
  };
}

export function resetHistoryIndex(history: PromptHistory): PromptHistory {
  return { ...history, index: null };
}

export function recallPrevious(
  history: PromptHistory,
  currentText: string,
): HistoryRecall | null {
  if (history.entries.length === 0) return null;

  if (history.index === null) {
    const index = history.entries.length - 1;
    const text = history.entries[index];
    if (text === undefined) return null;
    return {
      history: { ...history, index, draft: currentText },
      text,
      cursor: "start",
    };
  }

  if (history.index === 0) return null;

  const index = history.index - 1;
  const text = history.entries[index];
  if (text === undefined) return null;
  return {
    history: { ...history, index },
    text,
    cursor: "start",
  };
}

export function recallNext(
  history: PromptHistory,
  currentText: string,
): HistoryRecall | null {
  if (currentText.length === 0) return null;
  if (history.index === null) return null;

  if (history.index < history.entries.length - 1) {
    const index = history.index + 1;
    const text = history.entries[index];
    if (text === undefined) return null;
    return {
      history: { ...history, index },
      text,
      cursor: "end",
    };
  }

  return {
    history: { ...history, index: null },
    text: history.draft,
    cursor: "end",
  };
}
