import { TextAttributes } from "@opentui/core";
import { COMMAND_MENU_HINT } from "../../../lib/registry/commands";
import { statusBarHints } from "../../../lib/registry/shortcuts";
import type { LinkStatus } from "../../workspace/bridge";
import type { AppMode } from "../../../lib/types/mode";

export type { AppMode };

type StatusBarProps = {
  messageCount?: number;
  sessionLabel?: string;
  linkStatus?: LinkStatus;
  workspacePath?: string | null;
  open?: boolean;
  onToggle?: () => void;
};

const LINK_LABEL: Record<LinkStatus, string> = {
  disconnected: "Desconectado",
  connected: "Conectado",
  synced: "Sincronizado",
};

const LINK_COLOR: Record<LinkStatus, string> = {
  disconnected: "#f7768e",
  connected: "#7aa2f7",
  synced: "#9ece6a",
};

function shortPath(path: string | null | undefined): string {
  if (!path) return "";
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 2) return path;
  return `…/${parts.slice(-2).join("/")}`;
}

export function StatusBar({
  messageCount = 0,
  sessionLabel,
  linkStatus = "disconnected",
  workspacePath,
  open = false,
  onToggle,
}: StatusBarProps) {
  return (
    <box
      height={1}
      width="100%"
      backgroundColor="#1f2335"
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
      alignItems="center"
    >
      <box flexDirection="row" alignItems="center">
        <box
          onMouseDown={() => {
            onToggle?.();
          }}
        >
          <text fg="#7aa2f7">{open ? "▾" : "▸"}</text>
        </box>
        <text> </text>
        <text attributes={TextAttributes.BOLD}>Chavez Harness</text>
        <text> </text>
        <text fg={LINK_COLOR[linkStatus]} attributes={TextAttributes.BOLD}>
          ● {LINK_LABEL[linkStatus]}
        </text>
        {workspacePath ? (
          <text attributes={TextAttributes.DIM}> {shortPath(workspacePath)}</text>
        ) : null}
      </box>
      <box flexDirection="row" alignItems="center">
        {sessionLabel ? (
          <text attributes={TextAttributes.DIM}>{sessionLabel}</text>
        ) : null}
        {messageCount > 0 ? (
          <text attributes={TextAttributes.DIM}> · {messageCount}</text>
        ) : null}
      </box>
      <text attributes={TextAttributes.DIM}>
        {[COMMAND_MENU_HINT, statusBarHints()].filter(Boolean).join(" · ")}
      </text>
    </box>
  );
}
