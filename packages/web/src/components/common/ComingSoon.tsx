import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Hourglass } from "lucide-react";
import { StatusPill } from "./StatusPill";

type ComingSoonProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Extra content under the card (e.g. links to sections that do exist). */
  children?: ReactNode;
};

/** Placeholder for sections of the mock that have no backend yet. */
export function ComingSoon({ title, description, icon: Icon, children }: ComingSoonProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong bg-card px-6 py-12 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
          <Icon className="size-6" strokeWidth={1.6} />
        </span>
        <StatusPill tone="progress" dot={false}>
          <Hourglass />
          Próximamente
        </StatusPill>
        <h2 className="text-xl">{title}</h2>
        <p className="max-w-[46ch] text-sm text-muted-foreground">{description}</p>
        <p className="max-w-[46ch] text-xs text-faint">
          Esta sección existe en el diseño pero todavía no tiene backend. Por ahora el trabajo vive en
          Workspaces y en el TUI.
        </p>
        <a
          href="/workspaces"
          className="mt-1 inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          Ir a Workspaces
        </a>
      </div>
      {children}
    </div>
  );
}
