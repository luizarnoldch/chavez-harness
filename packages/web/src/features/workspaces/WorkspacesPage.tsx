"use client";

import { useCallback, useState } from "react";
import type { DashboardWorkspace } from "@chavez-harness/shared";
import { ChevronRight, Folder, FolderCode, Monitor, Power, PowerOff, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { ListGroup, Section } from "@/components/common/Section";
import { StatusPill } from "@/components/common/StatusPill";
import { AppShell, Page } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { sortWorkspaces } from "@/features/dashboard/activity";
import { setWorkspaceDaemon } from "@/lib/api";
import { basename, formatAgo, prettyPath } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUserActivity } from "@/lib/ws/useUserActivity";
import { SyncBadge } from "@/features/chat/header/SyncBadge";
import { daemonLabel, daemonTone, type DaemonStatus } from "./PresencePanel";

export function WorkspacesPage() {
  // Live list: GET /api/dashboard once, then workspace.updated / connection.status /
  // daemon.presence pushes over the page socket (no polling, no visibilitychange reload).
  const view = useUserActivity();
  const [busyId, setBusyId] = useState<string | null>(null);

  const workspaces = view.loaded ? sortWorkspaces(Object.values(view.workspaces)) : null;
  const machineOnline = view.loaded ? view.machineStatus === "online" : null;
  const error = view.loaded ? null : view.error;

  const toggleDaemon = useCallback(async (ws: DashboardWorkspace, desired: "on" | "off") => {
    setBusyId(ws.id);
    try {
      // The new state reaches this page through the pushes the server emits.
      await setWorkspaceDaemon(ws.id, desired, "web");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al controlar el daemon");
    } finally {
      setBusyId(null);
    }
  }, []);

  const live = (workspaces ?? []).filter((ws) => ws.daemonStatus === "online");
  const others = (workspaces ?? []).filter((ws) => ws.daemonStatus !== "online");

  return (
    <AppShell
      active="workspaces"
      title="Workspaces"
      breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Workspaces" }]}
      subtitle={
        <>
          <SyncBadge live={view.live} size="sm" />
          <span className="truncate">
            ·{" "}
            {workspaces
              ? `${workspaces.length} carpeta${workspaces.length === 1 ? "" : "s"} enlazada${workspaces.length === 1 ? "" : "s"} desde el TUI`
              : "Carpetas enlazadas desde el TUI"}
          </span>
        </>
      }
    >
      <Page>
        {machineOnline === false ? (
          <div className="flex items-start gap-3 rounded-xl border border-status-progress/40 bg-status-progress-soft px-4 py-3 text-[13px]">
            <TriangleAlert className="mt-0.5 size-[18px] shrink-0 text-status-progress" />
            <span>
              <span className="font-bold">PC offline</span>
              <br />
              <span className="text-muted-foreground">
                El Host no está conectado. Arranca el TUI o{" "}
                <code className="font-mono text-xs">bun run headless workspace host</code> en tu
                máquina antes de entrar a un workspace.
              </span>
            </span>
          </div>
        ) : machineOnline === true ? (
          <div className="flex items-center gap-2">
            <StatusPill tone="done" pulse>
              PC online
            </StatusPill>
            <span className="flex items-center gap-1 text-xs text-faint">
              <Monitor className="size-3.5" />
              Host conectado
            </span>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {workspaces === null ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-[72px] w-full rounded-xl" />
            <Skeleton className="h-[72px] w-full rounded-xl" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong">
            <EmptyState
              icon={FolderCode}
              title="Sin workspaces"
              description={
                <>
                  Los workspaces se crean desde el TUI: abre <code className="font-mono">chavez</code>{" "}
                  en la carpeta del proyecto y aparecerá aquí. El daemon queda latente hasta que lo
                  actives.
                </>
              }
            />
          </div>
        ) : (
          <>
            {live.length > 0 ? (
              <Section title={`En vivo · ${live.length}`}>
                <ListGroup>
                  {live.map((ws) => (
                    <WorkspaceRow
                      key={ws.id}
                      ws={ws}
                      machineOnline={machineOnline === true}
                      busy={busyId === ws.id}
                      onToggle={toggleDaemon}
                    />
                  ))}
                </ListGroup>
              </Section>
            ) : null}
            {others.length > 0 ? (
              <Section title={live.length > 0 ? "Otros" : "Workspaces"}>
                <ListGroup>
                  {others.map((ws) => (
                    <WorkspaceRow
                      key={ws.id}
                      ws={ws}
                      machineOnline={machineOnline === true}
                      busy={busyId === ws.id}
                      onToggle={toggleDaemon}
                    />
                  ))}
                </ListGroup>
              </Section>
            ) : null}
            <p className="text-center text-xs text-faint">
              ¿Falta una carpeta? Abre el TUI en ella para enlazarla.
            </p>
          </>
        )}
      </Page>
    </AppShell>
  );
}

type WorkspaceRowProps = {
  ws: DashboardWorkspace;
  machineOnline: boolean;
  busy: boolean;
  onToggle: (ws: DashboardWorkspace, desired: "on" | "off") => void;
};

function WorkspaceRow({ ws, machineOnline, busy, onToggle }: WorkspaceRowProps) {
  const daemon: DaemonStatus = ws.daemonStatus;
  const running = daemon === "online" || ws.daemonDesired === "on";
  const body = (
    <>
      <span
        className={cn(
          "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
          daemon === "online" ? "bg-agent-soft text-agent" : "bg-primary-soft text-primary-strong",
        )}
      >
        <Folder className="size-[18px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-semibold">{basename(ws.path)}</span>
        <span className="truncate font-mono text-xs text-faint" title={ws.path}>
          {prettyPath(ws.path)}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <StatusPill size="sm" tone={daemonTone(daemon)} pulse={daemon === "online"}>
            {daemonLabel(daemon)}
          </StatusPill>
          <span className="text-[11px] text-faint">Activo {formatAgo(ws.lastActiveAt)}</span>
          {!machineOnline ? <span className="text-[11px] text-faint">· Enciende el Host para entrar</span> : null}
        </span>
      </span>
    </>
  );

  return (
    <div className="flex items-start gap-2 pr-2">
      {machineOnline ? (
        <a
          href={`/workspaces/${ws.id}`}
          className="flex min-w-0 flex-1 items-start gap-3 py-3 pl-4 transition-colors [-webkit-tap-highlight-color:transparent] hover:opacity-90"
        >
          {body}
        </a>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3 py-3 pl-4 opacity-60">{body}</div>
      )}
      <div className="flex shrink-0 items-center gap-1 self-center">
        <Button
          type="button"
          size="sm"
          variant={running ? "outline" : "default"}
          disabled={!machineOnline || busy}
          onClick={() => onToggle(ws, running ? "off" : "on")}
          aria-label={running ? "Desactivar daemon" : "Activar daemon"}
        >
          {running ? <PowerOff /> : <Power />}
          <span className="hidden sm:inline">{running ? "Desactivar" : "Activar"}</span>
        </Button>
        {machineOnline ? (
          <a href={`/workspaces/${ws.id}`} aria-label="Abrir sesiones" className="hidden text-faint sm:inline-flex">
            <ChevronRight className="size-4" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
