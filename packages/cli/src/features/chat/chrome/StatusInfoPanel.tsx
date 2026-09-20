import { TextAttributes } from "@opentui/core";
import type { SessionUser } from "../../auth/api/api";
import type { LinkStatus } from "../../workspace/bridge";

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

export type StatusInfoPanelProps = {
  user?: SessionUser | null;
  workspacePath?: string | null;
  linkStatus?: LinkStatus;
  sessionLabel?: string;
  messageCount?: number;
};

export function StatusInfoPanel({
  user,
  workspacePath,
  linkStatus = "disconnected",
  sessionLabel,
  messageCount = 0,
}: StatusInfoPanelProps) {
  return (
    <box
      border
      borderColor="#414868"
      title="Info"
      paddingLeft={1}
      paddingRight={1}
      flexDirection="column"
    >
      <box flexDirection="row" height={1}>
        <text attributes={TextAttributes.BOLD}>Usuario </text>
        <text>
          {user ? `${user.name} · ${user.email}` : "—"}
        </text>
      </box>
      <box flexDirection="row" height={1}>
        <text attributes={TextAttributes.BOLD}>Workspace </text>
        <text fg={LINK_COLOR[linkStatus]}>{LINK_LABEL[linkStatus]}</text>
        <text attributes={TextAttributes.DIM}>
          {workspacePath ? ` ${workspacePath}` : " —"}
        </text>
      </box>
      <box flexDirection="row" height={1}>
        <text attributes={TextAttributes.BOLD}>Sesión </text>
        <text>
          {sessionLabel ?? "—"}
          {messageCount > 0 ? ` · ${messageCount} msgs` : ""}
        </text>
      </box>
    </box>
  );
}
