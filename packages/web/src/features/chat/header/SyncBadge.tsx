"use client";

import { StatusPill } from "@/components/common/StatusPill";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SocketLive } from "@/lib/ws/shared-socket";

const LABEL: Record<SocketLive, string> = {
  live: "En vivo",
  connecting: "Conectando…",
  offline: "Sin sync",
};

/** Tab-local link state (docs/ops-realtime-sync.md), not a session field. */
export function SyncBadge({ live, size = "md" }: { live: SocketLive; size?: "sm" | "md" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-full">
          <StatusPill
            size={size}
            tone={live === "live" ? "done" : live === "connecting" ? "progress" : "blocked"}
            pulse={live !== "offline"}
          >
            {LABEL[live]}
          </StatusPill>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-72">
        «En vivo» indica que este navegador está enlazado al hub (no es un estado global de la
        sesión). El TUI solo recibe el chat en vivo si tiene abierta esta misma sesión.
      </TooltipContent>
    </Tooltip>
  );
}
