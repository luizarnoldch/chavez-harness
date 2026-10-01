"use client";

import type { DashboardWorkspace } from "@chavez-harness/shared";
import { FolderCode, Folder, Globe, Power, PowerOff, SquareTerminal } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { daemonLabel, daemonTone } from "@/features/workspaces/PresencePanel";
import { basename, formatAgo, prettyPath } from "@/lib/format";
import { cn } from "@/lib/utils";
import { clientCounts } from "./activity";

type WorkspaceGridProps = {
  workspaces: DashboardWorkspace[];
  machineOnline: boolean;
  busyId: string | null;
  generatingFor: (workspaceId: string) => number;
  onToggle: (workspace: DashboardWorkspace, desired: "on" | "off") => void;
  now: number;
};

function ClientChip({ icon: Icon, label, count }: { icon: typeof Globe; label: string; count: number }) {
  if (count <= 0) return null;
  return (
    <span
      title={`${count} ${label} conectado${count === 1 ? "" : "s"}`}
      className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 text-[11px] leading-[18px] font-semibold text-muted-foreground"
    >
      <Icon className="size-3" />
      {label}
      {count > 1 ? ` ×${count}` : ""}
    </span>
  );
}

/** Workspace cards (320px grid): daemon, connected clients, sessions and quick on/off. */
export function WorkspaceGrid({
  workspaces,
  machineOnline,
  busyId,
  generatingFor,
  onToggle,
  now,
}: WorkspaceGridProps) {
  if (workspaces.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong">
        <EmptyState
          icon={FolderCode}
          compact
          title="Sin workspaces"
          description={
            <>
              Abre <code className="font-mono">chavez</code> en la carpeta de un proyecto y aparecerá
              aquí.
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5">
      {workspaces.map((ws) => {
        const running = ws.daemonStatus === "online" || ws.daemonDesired === "on";
        const clients = clientCounts(ws);
        const working = generatingFor(ws.id);
        return (
          <div
            key={ws.id}
            className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5"
          >
            <a
              href={machineOnline ? `/workspaces/${ws.id}` : undefined}
              aria-disabled={!machineOnline}
              className={cn(
                "flex min-w-0 items-start gap-3",
                machineOnline ? "hover:opacity-90" : "cursor-default opacity-70",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
                  ws.daemonStatus === "online"
                    ? "bg-agent-soft text-agent"
                    : "bg-primary-soft text-primary-strong",
                )}
              >
                <Folder className="size-[18px]" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-semibold">{basename(ws.path)}</span>
                <span className="truncate font-mono text-xs text-faint" title={ws.path}>
                  {prettyPath(ws.path)}
                </span>
              </span>
            </a>

            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill size="sm" tone={daemonTone(ws.daemonStatus)} pulse={ws.daemonStatus === "online"}>
                {daemonLabel(ws.daemonStatus)}
              </StatusPill>
              {working > 0 ? (
                <StatusPill size="sm" tone="progress" pulse>
                  {working} generando
                </StatusPill>
              ) : null}
              <ClientChip icon={SquareTerminal} label="TUI" count={clients.tui} />
              <ClientChip icon={Globe} label="Web" count={clients.web} />
            </div>

            <div className="mt-auto flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[11px] text-faint">
                {ws.sessionCount} sesion{ws.sessionCount === 1 ? "" : "es"} · activo{" "}
                {formatAgo(ws.lastActiveAt, now)}
              </span>
              <Button
                type="button"
                size="sm"
                variant={running ? "outline" : "default"}
                disabled={!machineOnline || busyId === ws.id}
                onClick={() => onToggle(ws, running ? "off" : "on")}
                aria-label={running ? "Desactivar daemon" : "Activar daemon"}
              >
                {running ? <PowerOff /> : <Power />}
                {running ? "Desactivar" : "Activar"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
