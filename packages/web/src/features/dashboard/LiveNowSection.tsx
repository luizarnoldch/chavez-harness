"use client";

import type { DashboardSession } from "@chavez-harness/shared";
import { Zap } from "lucide-react";
import { Section } from "@/components/common/Section";
import { modeLabel, modeTone, StatusPill } from "@/components/common/StatusPill";
import { WorkingStatus } from "@/features/chat/live/WorkingStatus";
import type { GenerateStream } from "@/features/chat/live/generate-stream";
import { basename } from "@/lib/format";
import type { GeneratingSession } from "./activity";

type LiveNowSectionProps = {
  generating: GeneratingSession[];
  sessions: DashboardSession[];
  /** workspaceId → absolute path, for sessions that are not in the recent list. */
  workspacePaths: Record<string, string>;
};

/** Adapt a store entry to the chat's in-flight stream so `WorkingStatus` can render it. */
function toStream(g: GeneratingSession): GenerateStream | null {
  if (g.phase === "waiting") return null;
  return {
    sessionId: g.sessionId,
    phase: g.phase,
    draftText: "",
    draftTools: g.toolName ? [{ id: "live", name: g.toolName, status: "running" }] : [],
  };
}

/** "En vivo ahora · N": one card per session the agent is working on. */
export function LiveNowSection({ generating, sessions, workspacePaths }: LiveNowSectionProps) {
  return (
    <Section title={`En vivo ahora${generating.length > 0 ? ` · ${generating.length}` : ""}`}>
      {generating.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border-strong px-4 py-3.5 text-[13px] text-faint">
          <Zap className="size-4 shrink-0" />
          Ningún agente trabajando ahora. Aquí aparecerán las sesiones en curso, del TUI o de la web.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5">
          {generating.map((g) => {
            const session = sessions.find((s) => s.id === g.sessionId);
            const path = session?.workspacePath ?? workspacePaths[g.workspaceId];
            return (
              <a
                key={g.sessionId}
                href={`/sessions/${g.sessionId}`}
                className="relative flex min-w-0 flex-col gap-1.5 overflow-hidden rounded-xl border border-border bg-card py-3 pr-4 pl-5 transition-colors hover:bg-muted/60"
              >
                <span aria-hidden="true" className="absolute top-3 bottom-3 left-0 w-[3px] rounded-r-[3px] bg-agent" />
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-faint">
                    {path ? basename(path) : "workspace"}
                  </span>
                  {session ? (
                    <StatusPill size="sm" tone={modeTone(session.mode)}>
                      {modeLabel(session.mode)}
                    </StatusPill>
                  ) : null}
                </span>
                <span className="line-clamp-2 leading-snug font-semibold">
                  {session?.title?.trim() || "Sesión en curso"}
                </span>
                <WorkingStatus stream={toStream(g)} sending={g.phase === "waiting"} />
              </a>
            );
          })}
        </div>
      )}
    </Section>
  );
}
