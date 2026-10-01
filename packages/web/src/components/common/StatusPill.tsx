import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PillTone =
  | "done"
  | "progress"
  | "blocked"
  | "backlog"
  | "review"
  | "planned"
  | "todo"
  | "plan"
  | "build"
  | "agent"
  | "accent";

/** Full class strings so Tailwind can see them (mock `--status-*` / `-soft` pairs). */
const TONE_CLASS: Record<PillTone, string> = {
  done: "text-status-done bg-status-done-soft",
  progress: "text-status-progress bg-status-progress-soft",
  blocked: "text-status-blocked bg-status-blocked-soft",
  backlog: "text-status-backlog bg-status-backlog-soft",
  review: "text-status-review bg-status-review-soft",
  planned: "text-status-planned bg-status-planned-soft",
  todo: "text-status-todo bg-status-todo-soft",
  plan: "text-stage-plan bg-stage-plan-soft",
  build: "text-stage-build bg-stage-build-soft",
  agent: "text-agent bg-agent-soft",
  accent: "text-primary-strong bg-primary-soft",
};

type StatusPillProps = {
  tone: PillTone;
  children: ReactNode;
  /** Pulsing dot for live states (running, connecting). */
  pulse?: boolean;
  /** Hide the leading dot (e.g. when an icon is passed as child). */
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
  title?: string;
};

/** Dot + label pill, the mock's `ui.pill()`. */
export function StatusPill({
  tone,
  children,
  pulse,
  dot = true,
  size = "md",
  className,
  title,
}: StatusPillProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full font-semibold whitespace-nowrap [&_svg]:size-3",
        size === "sm" ? "px-1.5 text-[11px] leading-[18px]" : "px-2 py-[3px] text-xs leading-[1.4]",
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full bg-current", pulse && "animate-pulse-dot")}
        />
      ) : null}
      {children}
    </span>
  );
}

export function modeTone(mode: "plan" | "build" | null | undefined): PillTone {
  return mode === "build" ? "build" : "plan";
}

export function modeLabel(mode: "plan" | "build" | null | undefined): string {
  return mode === "build" ? "Build" : "Plan";
}
