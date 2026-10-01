"use client";

import type { ReactNode } from "react";
import { Activity, FolderCode, Monitor, MessageSquareText, type LucideIcon } from "lucide-react";
import { StatusPill } from "@/components/common/StatusPill";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StatRowProps = {
  loaded: boolean;
  machine: "online" | "offline";
  workspacesLive: number;
  workspacesTotal: number;
  generating: number;
  sessionsToday: number;
};

function Stat({
  icon: Icon,
  label,
  hint,
  accent,
  children,
}: {
  icon: LucideIcon;
  label: string;
  hint: ReactNode;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center justify-between gap-2 text-faint">
        <span className="truncate text-[11px] font-semibold tracking-[0.06em] uppercase">{label}</span>
        <Icon className={cn("size-4 shrink-0", accent && "text-agent")} />
      </div>
      <div
        className={cn(
          "flex min-h-8 items-center font-heading text-[26px] leading-none font-bold tabular-nums",
          accent && "text-agent",
        )}
      >
        {children}
      </div>
      <div className="truncate text-xs text-faint">{hint}</div>
    </div>
  );
}

/** Four numbers on top of the dashboard (mock agent stat row). */
export function StatRow({
  loaded,
  machine,
  workspacesLive,
  workspacesTotal,
  generating,
  sessionsToday,
}: StatRowProps) {
  const value = (node: ReactNode) => (loaded ? node : <Skeleton className="h-7 w-14" />);
  return (
    <div className="grid grid-cols-2 gap-2.5 desk:grid-cols-4" aria-label="Resumen">
      <Stat
        icon={Monitor}
        label="PC"
        hint={machine === "online" ? "Host conectado" : "Arranca el Host en tu máquina"}
      >
        {value(
          <StatusPill tone={machine === "online" ? "done" : "backlog"} pulse={machine === "online"}>
            {machine === "online" ? "Online" : "Offline"}
          </StatusPill>,
        )}
      </Stat>
      <Stat
        icon={FolderCode}
        label="Workspaces activos"
        hint={`de ${workspacesTotal} enlazado${workspacesTotal === 1 ? "" : "s"}`}
      >
        {value(workspacesLive)}
      </Stat>
      <Stat
        icon={Activity}
        label="Generando ahora"
        hint={generating > 0 ? "El agente está trabajando" : "Ninguna sesión en curso"}
        accent={generating > 0}
      >
        {value(generating)}
      </Stat>
      <Stat icon={MessageSquareText} label="Sesiones hoy" hint="con actividad hoy">
        {value(sessionsToday)}
      </Stat>
    </div>
  );
}
