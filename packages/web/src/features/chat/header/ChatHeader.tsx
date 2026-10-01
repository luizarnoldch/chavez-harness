"use client";

import type { ChatSessionDto, WorkspaceDto } from "@chavez-harness/shared";
import { Bot, Clock, Folder } from "lucide-react";
import { modeLabel, modeTone, StatusPill } from "@/components/common/StatusPill";
import { basename, formatAgo } from "@/lib/format";
import type { SocketLive } from "@/lib/ws/shared-socket";
import { PresencePanel, type PresenceState } from "@/features/workspaces/PresencePanel";
import { MODE_HINT, type ChatMode } from "../composer/ModePill";
import { SyncBadge } from "./SyncBadge";

type ChatHeaderProps = {
  session: ChatSessionDto;
  workspace: WorkspaceDto | null;
  /** Mode selected in the composer (what the next message will use). */
  mode: ChatMode;
  live: SocketLive;
  presence: PresenceState | null;
  onActivate: () => void;
  onDeactivate: () => void;
  controlling: boolean;
  controlError: string | null;
};

/** Session card at the top of the transcript (mock `.chat-head`). */
export function ChatHeader({
  session,
  workspace,
  mode,
  live,
  presence,
  onActivate,
  onDeactivate,
  controlling,
  controlError,
}: ChatHeaderProps) {
  return (
    <header className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-lg bg-agent-soft text-agent">
          <Bot className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-bold">{session.title?.trim() || "Sesión sin título"}</span>
          <span className="truncate font-mono text-xs text-faint">
            {session.provider} · {session.model}
          </span>
        </div>
        <SyncBadge live={live} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill tone={modeTone(mode)} title={MODE_HINT[mode]}>
          {modeLabel(mode)}
        </StatusPill>
        <span className="text-xs text-faint">{MODE_HINT[mode]}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {workspace ? (
          <span
            title={workspace.path}
            className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          >
            <Folder className="size-3 shrink-0" />
            <span className="truncate">{basename(workspace.path)}</span>
          </span>
        ) : null}
        {session.lastMessageAt ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            <Clock className="size-3" />
            {formatAgo(session.lastMessageAt)}
          </span>
        ) : null}
      </div>

      <PresencePanel
        presence={presence}
        compact
        onActivate={onActivate}
        onDeactivate={onDeactivate}
        controlling={controlling}
        controlError={controlError}
      />
    </header>
  );
}
