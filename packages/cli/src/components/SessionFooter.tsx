import { TextAttributes } from "@opentui/core";
import { useEffect, useState } from "react";
import type { AppMode } from "./StatusBar";

const PLAN_COLOR = "#e0af68";
const BUILD_COLOR = "#9ece6a";
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

type SessionFooterProps = {
  busy: boolean;
  model: string;
  mode: AppMode;
};

type ModeChipProps = {
  label: string;
  active: boolean;
  activeColor: string;
};

function ModeChip({ label, active, activeColor }: ModeChipProps) {
  return (
    <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={active ? activeColor : "#2a2e3f"}>
      <text
        fg={active ? "#1a1b26" : "#888888"}
        attributes={active ? TextAttributes.BOLD : TextAttributes.DIM}
      >
        {label}
      </text>
    </box>
  );
}

export function SessionFooter({ busy, model, mode }: SessionFooterProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => {
      setFrame((current) => (current + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, [busy]);

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
        <text attributes={TextAttributes.DIM}>{model}</text>
      </box>
      <box flexDirection="row" alignItems="center">
        <ModeChip label="Plan" active={mode === "plan"} activeColor={PLAN_COLOR} />
        <text> </text>
        <ModeChip label="Build" active={mode === "build"} activeColor={BUILD_COLOR} />
      </box>
    </box>
  );
}
