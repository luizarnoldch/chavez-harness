import { TextAttributes } from "@opentui/core";
import { useEffect, useState } from "react";
import type { AppMode } from "../../../lib/types/mode";

const PLAN_COLOR = "#e0af68";
const BUILD_COLOR = "#9ece6a";
const MODEL_COLOR = "#7aa2f7";
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

type SessionFooterProps = {
  busy: boolean;
  model: string;
  provider?: string;
  mode: AppMode;
  streamPhase?: "reasoning" | "streaming" | "tool" | null;
  onOpenModels?: () => void;
};

type ModeChipProps = {
  label: string;
  active: boolean;
  activeColor: string;
  onMouseDown?: () => void;
};

function ModeChip({ label, active, activeColor, onMouseDown }: ModeChipProps) {
  return (
    <box
      height={1}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={active ? activeColor : "#2a2e3f"}
      onMouseDown={onMouseDown}
    >
      <text
        fg={active ? "#1a1b26" : "#888888"}
        attributes={active ? TextAttributes.BOLD : TextAttributes.DIM}
      >
        {label}
      </text>
    </box>
  );
}

export function SessionFooter({
  busy,
  model,
  provider,
  mode,
  streamPhase = null,
  onOpenModels,
}: SessionFooterProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => {
      setFrame((current) => (current + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, [busy]);

  const modelLabel = provider ? `${provider} · ${model}` : model;
  const phaseLabel =
    streamPhase === "reasoning"
      ? "razonando…"
      : streamPhase === "streaming"
        ? "escribiendo…"
        : streamPhase === "tool"
          ? "herramientas…"
          : busy
            ? "generando…"
            : null;

  return (
    <box
      height={1}
      width="100%"
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      paddingLeft={1}
      paddingRight={1}
    >
      <box flexDirection="row" alignItems="center">
        {busy ? <text fg="#7aa2f7">{SPINNER_FRAMES[frame]} </text> : null}
        {phaseLabel ? (
          <text fg="#7aa2f7" attributes={TextAttributes.DIM}>
            {phaseLabel}
          </text>
        ) : null}
      </box>
      <box flexDirection="row" alignItems="center">
        <ModeChip
          label={modelLabel}
          active
          activeColor={MODEL_COLOR}
          onMouseDown={onOpenModels}
        />
        <text> </text>
        <ModeChip
          label={mode === "plan" ? "Plan · solo lectura" : "Plan"}
          active={mode === "plan"}
          activeColor={PLAN_COLOR}
        />
        <text> </text>
        <ModeChip
          label={mode === "build" ? "Build · completo" : "Build"}
          active={mode === "build"}
          activeColor={BUILD_COLOR}
        />
      </box>
    </box>
  );
}
