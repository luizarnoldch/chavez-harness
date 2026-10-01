"use client";

import type { WorkspaceConnection } from "@chavez-harness/shared";
import { Monitor, Power, PowerOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill, type PillTone } from "@/components/common/StatusPill";
import { cn } from "@/lib/utils";

export type DaemonStatus = "online" | "offline" | "stale";
export type MachineStatus = "online" | "offline";

export type PresenceState = {
  daemon: DaemonStatus;
  daemonDesired?: "on" | "off";
  machineStatus?: MachineStatus;
  connections: WorkspaceConnection[];
};

type PresencePanelProps = {
  presence: PresenceState | null;
  compact?: boolean;
  className?: string;
  onActivate?: () => void;
  onDeactivate?: () => void;
  controlling?: boolean;
  controlError?: string | null;
};

export function daemonTone(status: DaemonStatus | MachineStatus): PillTone {
  if (status === "online") return "done";
  if (status === "stale") return "progress";
  return "backlog";
}

export function daemonLabel(status: DaemonStatus): string {
  if (status === "online") return "Daemon online";
  if (status === "stale") return "Daemon stale";
  return "Daemon latente";
}

function canActivate(presence: PresenceState): boolean {
  return (presence.machineStatus ?? "offline") === "online" && presence.daemon !== "online";
}

function canDeactivate(presence: PresenceState): boolean {
  return !(presence.daemon === "offline" && (presence.daemonDesired ?? "off") === "off");
}

function ControlButtons({
  presence,
  onActivate,
  onDeactivate,
  controlling,
  compact,
}: {
  presence: PresenceState;
  onActivate?: () => void;
  onDeactivate?: () => void;
  controlling?: boolean;
  compact?: boolean;
}) {
  if (!onActivate && !onDeactivate) return null;
  const size = compact ? "xs" : "sm";
  return (
    <div className="flex flex-wrap gap-2">
      {onActivate ? (
        <Button
          type="button"
          size={size}
          disabled={controlling || !canActivate(presence)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onActivate();
          }}
        >
          <Power />
          Activar
        </Button>
      ) : null}
      {onDeactivate ? (
        <Button
          type="button"
          size={size}
          variant="outline"
          disabled={controlling || !canDeactivate(presence)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDeactivate();
          }}
        >
          <PowerOff />
          Desactivar
        </Button>
      ) : null}
    </div>
  );
}

export function PresencePanel({
  presence,
  compact,
  className,
  onActivate,
  onDeactivate,
  controlling,
  controlError,
}: PresencePanelProps) {
  if (!presence) {
    return compact ? (
      <Skeleton className={cn("h-5 w-48", className)} />
    ) : (
      <Skeleton className={cn("h-28 w-full rounded-xl", className)} />
    );
  }

  const clients = presence.connections.filter((c) => c.clientKind === "client");
  const daemons = presence.connections.filter((c) => c.clientKind === "daemon");
  const machine = presence.machineStatus ?? "offline";
  const desired = presence.daemonDesired ?? "off";

  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
        <StatusPill size="sm" tone={daemonTone(machine)}>
          PC {machine}
        </StatusPill>
        <StatusPill size="sm" tone={daemonTone(presence.daemon)} pulse={presence.daemon === "online"}>
          {daemonLabel(presence.daemon)}
        </StatusPill>
        <span className="text-[11px] text-faint">
          {clients.length} cliente{clients.length === 1 ? "" : "s"}
        </span>
        <ControlButtons
          presence={presence}
          onActivate={onActivate}
          onDeactivate={onDeactivate}
          controlling={controlling}
          compact
        />
        {controlError ? (
          <p className="w-full text-[11px] text-destructive" role="alert">
            {controlError}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ul className="flex flex-col gap-2 text-sm">
        <li className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Monitor className="size-4" />
            PC (Host)
          </span>
          <StatusPill tone={daemonTone(machine)}>{machine}</StatusPill>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Power className="size-4" />
            Daemon
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xs text-faint">
              deseado {desired}
              {daemons.length > 1 ? ` · ${daemons.length}` : ""}
            </span>
            <StatusPill tone={daemonTone(presence.daemon)} pulse={presence.daemon === "online"}>
              {presence.daemon}
            </StatusPill>
          </span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Users className="size-4" />
            Clientes (TUI / web)
          </span>
          <span className="font-medium tabular-nums">{clients.length}</span>
        </li>
      </ul>

      <ControlButtons
        presence={presence}
        onActivate={onActivate}
        onDeactivate={onDeactivate}
        controlling={controlling}
      />

      {controlError ? (
        <p className="text-xs text-destructive" role="alert">
          {controlError}
        </p>
      ) : null}

      {machine === "offline" ? (
        <p className="text-xs text-faint">
          PC offline. Arranca el Host en tu máquina (
          <code className="font-mono">chavez headless workspace host</code> o abre el TUI).
        </p>
      ) : presence.connections.length === 0 && presence.daemon === "offline" ? (
        <p className="text-xs text-faint">Daemon latente. Actívalo aquí o abre el TUI en este path.</p>
      ) : null}
    </div>
  );
}
