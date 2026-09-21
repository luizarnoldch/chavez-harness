"use client";

import type { WorkspaceConnection } from "@chavez-harness/shared";
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

function statusClass(daemon: DaemonStatus | MachineStatus): string {
  if (daemon === "online") return "text-build";
  if (daemon === "stale") return "text-plan";
  return "text-muted-foreground";
}

function statusLabel(daemon: DaemonStatus | MachineStatus): string {
  if (daemon === "online") return "online";
  if (daemon === "stale") return "stale";
  return "offline";
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
  const machine = presence.machineStatus ?? "offline";
  const desired = presence.daemonDesired ?? "off";
  const btn = compact
    ? "rounded px-2 py-0.5 text-[10px] font-medium"
    : "rounded-md px-3 py-1.5 text-xs font-medium";

  return (
    <div className={cn("flex flex-wrap gap-2", compact ? "mt-1.5" : "mt-3")}>
      {onActivate ? (
        <button
          type="button"
          disabled={controlling || machine === "offline" || presence.daemon === "online"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onActivate();
          }}
          className={cn(
            btn,
            "bg-primary text-primary-foreground disabled:opacity-50",
          )}
        >
          Activar
        </button>
      ) : null}
      {onDeactivate ? (
        <button
          type="button"
          disabled={
            controlling || (presence.daemon === "offline" && desired === "off")
          }
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDeactivate();
          }}
          className={cn(
            btn,
            "border border-border disabled:opacity-50",
          )}
        >
          Desactivar
        </button>
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
    return (
      <p className={cn("text-muted-foreground text-xs", className)}>
        Cargando conexiones…
      </p>
    );
  }

  const clients = presence.connections.filter((c) => c.clientKind === "client");
  const daemons = presence.connections.filter((c) => c.clientKind === "daemon");
  const machine = presence.machineStatus ?? "offline";
  const desired = presence.daemonDesired ?? "off";

  if (compact) {
    return (
      <div className={cn(className)}>
        <p className="text-xs">
          <span className={statusClass(machine)}>PC {statusLabel(machine)}</span>
          <span className="text-muted-foreground"> · </span>
          <span className={statusClass(presence.daemon)}>
            Daemon {statusLabel(presence.daemon)}
          </span>
          <span className="text-muted-foreground"> · </span>
          <span className="text-muted-foreground">
            {clients.length} cliente{clients.length === 1 ? "" : "s"}
          </span>
        </p>
        <ControlButtons
          presence={presence}
          onActivate={onActivate}
          onDeactivate={onDeactivate}
          controlling={controlling}
          compact
        />
        {controlError ? (
          <p className="text-destructive mt-1 text-[10px]" role="alert">
            {controlError}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card/60 px-4 py-3",
        className,
      )}
    >
      <p className="text-sm font-medium tracking-tight">Conexiones activas</p>
      <ul className="mt-2 flex flex-col gap-1.5 text-sm">
        <li className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">PC (Host)</span>
          <span className={cn("font-medium", statusClass(machine))}>
            {statusLabel(machine)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Daemon</span>
          <span className={cn("font-medium", statusClass(presence.daemon))}>
            {statusLabel(presence.daemon)}
            {desired === "on" ? " · deseado on" : " · deseado off"}
            {daemons.length > 1 ? ` (${daemons.length})` : ""}
          </span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Clientes (TUI / web)</span>
          <span className="font-medium">{clients.length}</span>
        </li>
      </ul>

      <ControlButtons
        presence={presence}
        onActivate={onActivate}
        onDeactivate={onDeactivate}
        controlling={controlling}
      />

      {controlError ? (
        <p className="text-destructive mt-2 text-xs" role="alert">
          {controlError}
        </p>
      ) : null}

      {machine === "offline" ? (
        <p className="text-muted-foreground mt-2 text-xs">
          PC offline. Arranca el Host en tu máquina (`chavez headless workspace host` o abre el
          TUI).
        </p>
      ) : presence.connections.length === 0 && presence.daemon === "offline" ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Daemon latente. Actívalo aquí o abre el TUI en este path.
        </p>
      ) : null}
    </div>
  );
}
