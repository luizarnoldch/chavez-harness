"use client";

import { Hammer, ListChecks } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ChatMode = "plan" | "build";

export const MODE_HINT: Record<ChatMode, string> = {
  plan: "Solo lectura: explora y planifica, sin escritura ni shell.",
  build: "Herramientas completas del agente: lectura, edición, shell, web…",
};

type ModePillProps = {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
  disabled?: boolean;
};

/** Plan ↔ Build toggle; the value is sent as `mode` on `chat.send`. */
export function ModePill({ mode, onChange, disabled }: ModePillProps) {
  const Icon = mode === "build" ? Hammer : ListChecks;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`Modo ${mode === "build" ? "Build" : "Plan"}. Pulsa para alternar.`}
          onClick={() => onChange(mode === "build" ? "plan" : "build")}
          className={cn(
            "inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors disabled:opacity-50",
            mode === "build"
              ? "bg-stage-build-soft text-stage-build"
              : "bg-stage-plan-soft text-stage-plan",
          )}
        >
          <Icon className="size-3" />
          {mode === "build" ? "Build" : "Plan"}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64">
        {MODE_HINT[mode]}
      </TooltipContent>
    </Tooltip>
  );
}
