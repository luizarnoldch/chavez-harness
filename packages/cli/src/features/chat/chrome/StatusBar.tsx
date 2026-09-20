import { TextAttributes } from "@opentui/core";
import { COMMAND_MENU_HINT } from "../../../lib/registry/commands";
import { statusBarHints } from "../../../lib/registry/shortcuts";
import type { AppMode } from "../../../lib/types/mode";

export type { AppMode };

type StatusBarProps = {
  messageCount?: number;
  sessionLabel?: string;
};

export function StatusBar({ messageCount = 0, sessionLabel }: StatusBarProps) {
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
      <text attributes={TextAttributes.BOLD}>Chavez Harness</text>
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
