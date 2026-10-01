"use client";

import type { PushOrigin } from "@chavez-harness/shared";
import {
  Cpu,
  Folder,
  Hammer,
  ListChecks,
  MessageSquareText,
  Monitor,
  Plus,
  Power,
  Radio,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Section } from "@/components/common/Section";
import { StatusPill, type PillTone } from "@/components/common/StatusPill";
import { basename, formatAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  describeActivity,
  ORIGIN_LABEL,
  type ActivityEntry,
  type ActivityKind,
} from "./activity";

const ICON: Record<ActivityKind, LucideIcon> = {
  message: MessageSquareText,
  "session.created": Plus,
  "session.deleted": Trash2,
  "session.mode": ListChecks,
  "session.model": Cpu,
  daemon: Power,
  machine: Monitor,
  workspace: Folder,
};

const ORIGIN_TONE: Record<PushOrigin, PillTone> = {
  tui: "review",
  web: "accent",
  api: "backlog",
};

type ActivityFeedProps = {
  entries: ActivityEntry[];
  /** workspaceId → absolute path (labels the entries). */
  workspacePaths: Record<string, string>;
  now: number;
};

function iconFor(entry: ActivityEntry): LucideIcon {
  if (entry.kind === "session.mode" && entry.detail === "build") return Hammer;
  return ICON[entry.kind];
}

/** Live feed, newest first: messages, sessions, mode/model changes, daemon and PC. */
export function ActivityFeed({ entries, workspacePaths, now }: ActivityFeedProps) {
  return (
    <Section title="Actividad">
      {entries.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border-strong px-4 py-6 text-[13px] text-faint">
          <Radio className="size-4 shrink-0" />
          Sin actividad todavía. Lo que pase en el TUI o en la web aparecerá aquí en vivo.
        </div>
      ) : (
        <ol
          aria-live="polite"
          className="max-h-[440px] overflow-y-auto rounded-xl border border-border bg-card [&>li+li]:border-t [&>li+li]:border-border"
        >
          {entries.map((entry) => {
            const Icon = iconFor(entry);
            const path = entry.workspaceId ? workspacePaths[entry.workspaceId] : undefined;
            const body = (
              <>
                <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-3.5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                      {describeActivity(entry, path ? basename(path) : null)}
                    </span>
                    {entry.origin ? (
                      <StatusPill size="sm" dot={false} tone={ORIGIN_TONE[entry.origin]}>
                        {ORIGIN_LABEL[entry.origin]}
                      </StatusPill>
                    ) : null}
                  </span>
                  {entry.text ? (
                    <span
                      className={cn(
                        "line-clamp-1 text-xs text-faint",
                        entry.detail === "assistant-error" && "text-destructive",
                      )}
                    >
                      {entry.text}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 pt-0.5 text-[11px] whitespace-nowrap text-faint">
                  {formatAgo(new Date(entry.at).toISOString(), now)}
                </span>
              </>
            );
            const link = entry.sessionId && entry.kind !== "session.deleted";
            return (
              <li key={entry.id}>
                {link ? (
                  <a
                    href={`/sessions/${entry.sessionId}`}
                    className="flex items-start gap-3 px-3.5 py-2.5 transition-colors hover:bg-muted/60"
                  >
                    {body}
                  </a>
                ) : (
                  <div className="flex items-start gap-3 px-3.5 py-2.5">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}
