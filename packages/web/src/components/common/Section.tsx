import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionProps = {
  title?: ReactNode;
  /** Right side of the heading row (link, count…). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Uppercase section label + content (mock `.section`). */
export function Section({ title, action, children, className }: SectionProps) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      {title || action ? (
        <div className="flex min-h-7 items-center gap-2">
          {title ? (
            <h2 className="flex-1 font-sans text-xs font-bold tracking-[0.06em] text-faint uppercase">
              {title}
            </h2>
          ) : null}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Grouped list container (mock `.list`): rows separated by hairlines. */
export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card [&>*+*]:border-t [&>*+*]:border-border",
        className,
      )}
    >
      {children}
    </div>
  );
}
