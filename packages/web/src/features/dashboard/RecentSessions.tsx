"use client";

import type { DashboardSession } from "@chavez-harness/shared";
import { MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ListGroup, Section } from "@/components/common/Section";
import { modeLabel, modeTone, StatusPill } from "@/components/common/StatusPill";
import { basename, formatAgo } from "@/lib/format";

type RecentSessionsProps = {
  sessions: DashboardSession[];
  generatingIds: ReadonlySet<string>;
  now: number;
};

const SHOWN = 6;

/** Latest sessions across every workspace. */
export function RecentSessions({ sessions, generatingIds, now }: RecentSessionsProps) {
  return (
    <Section
      title="Sesiones recientes"
      action={
        <a href="/workspaces" className="text-xs font-semibold text-primary-strong hover:underline">
          Workspaces
        </a>
      }
    >
      {sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong">
          <EmptyState
            icon={MessageSquareText}
            compact
            title="Sin sesiones todavía"
            description="Crea una desde un workspace o desde el TUI."
          />
        </div>
      ) : (
        <ListGroup>
          {sessions.slice(0, SHOWN).map((session) => (
            <a
              key={session.id}
              href={`/sessions/${session.id}`}
              className="flex items-start gap-3 px-3.5 py-2.5 transition-colors hover:bg-muted/60"
            >
              <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-agent-soft text-agent">
                <MessageSquareText className="size-3.5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13px] font-semibold">
                  {session.title?.trim() || "Sesión sin título"}
                </span>
                <span className="truncate text-[11px] text-faint">
                  {basename(session.workspacePath)} ·{" "}
                  {session.lastMessageAt ? formatAgo(session.lastMessageAt, now) : "sin mensajes"}
                </span>
              </span>
              {generatingIds.has(session.id) ? (
                <StatusPill size="sm" tone="progress" pulse>
                  Trabajando
                </StatusPill>
              ) : null}
              <StatusPill size="sm" tone={modeTone(session.mode)}>
                {modeLabel(session.mode)}
              </StatusPill>
            </a>
          ))}
        </ListGroup>
      )}
    </Section>
  );
}
