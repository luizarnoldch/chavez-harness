import {
  SELECTABLE_CHAT_PROVIDERS,
  SUPPORTED_CHAT_MODELS,
  type SupportedProvider,
} from "@chavez-harness/shared";
import type { ScrollBoxRenderable } from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import { matchesShortcut } from "../../../lib/registry/match";
import { getShortcut } from "../../../lib/registry/shortcuts";

const MAX_VISIBLE = 8;

export type ModelChoice = {
  provider: SupportedProvider;
  model: string;
};

type ModelsDialogProps = {
  onClose: () => void;
  onSelect: (choice: ModelChoice) => void;
  currentProvider?: string;
  currentModel?: string;
  onUnsupported?: (provider: string) => void;
};

function isSelectable(provider: SupportedProvider): boolean {
  return (SELECTABLE_CHAT_PROVIDERS as readonly string[]).includes(provider);
}

function rowLabel(provider: string, id: string): string {
  return `${provider} · ${id}`;
}

export function ModelsDialog({
  onClose,
  onSelect,
  currentProvider,
  currentModel,
  onUnsupported,
}: ModelsDialogProps) {
  const models = [...SUPPORTED_CHAT_MODELS];
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = models.findIndex(
      (m) => m.provider === currentProvider && m.id === currentModel,
    );
    return idx >= 0 ? idx : 0;
  });

  useKeyboard((key) => {
    if (matchesShortcut(key, getShortcut("focus-prompt")) || key.name === "escape") {
      key.preventDefault();
      onClose();
      return;
    }

    if (models.length === 0) return;

    if (key.name === "up" || key.name === "k") {
      key.preventDefault();
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.name === "down" || key.name === "j") {
      key.preventDefault();
      setSelectedIndex((i) => Math.min(models.length - 1, i + 1));
      return;
    }
    if (key.name === "return" || key.name === "kpenter") {
      key.preventDefault();
      const entry = models[selectedIndex];
      if (!entry) return;
      if (!isSelectable(entry.provider)) {
        onUnsupported?.(entry.provider);
        return;
      }
      onSelect({ provider: entry.provider, model: entry.id });
    }
  });

  const visibleRows = Math.min(models.length, MAX_VISIBLE);
  const safeIndex =
    models.length === 0 ? 0 : Math.min(selectedIndex, models.length - 1);

  return (
    <ModelsList
      models={models}
      safeIndex={safeIndex}
      visibleRows={visibleRows}
      currentProvider={currentProvider}
      currentModel={currentModel}
    />
  );
}

type ModelsListProps = {
  models: Array<(typeof SUPPORTED_CHAT_MODELS)[number]>;
  safeIndex: number;
  visibleRows: number;
  currentProvider?: string;
  currentModel?: string;
};

function ModelsList({
  models,
  safeIndex,
  visibleRows,
  currentProvider,
  currentModel,
}: ModelsListProps) {
  const scrollRef = useRef<ScrollBoxRenderable>(null);

  useEffect(() => {
    scrollRef.current?.scrollChildIntoView(`model-${safeIndex}`);
  }, [safeIndex]);

  return (
    <box border borderColor="#7aa2f7" title="Modelo" height={visibleRows + 2}>
      <scrollbox ref={scrollRef} height={visibleRows} flexGrow={1}>
        {models.map((entry, index) => {
          const selected = index === safeIndex;
          const active =
            entry.provider === currentProvider && entry.id === currentModel;
          const selectable = isSelectable(entry.provider);
          return (
            <box
              key={`${entry.provider}:${entry.id}:${index}`}
              id={`model-${index}`}
              height={1}
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={selected ? "#334455" : undefined}
              flexDirection="row"
            >
              <text
                fg={
                  selected
                    ? "#FFFF00"
                    : selectable
                      ? "#FFFFFF"
                      : "#888888"
                }
                attributes={selectable ? undefined : TextAttributes.DIM}
              >
                {active ? "● " : "  "}
                {rowLabel(entry.provider, entry.id)}
              </text>
              {!selectable ? (
                <text attributes={TextAttributes.DIM}> · n/d</text>
              ) : null}
            </box>
          );
        })}
      </scrollbox>
    </box>
  );
}
