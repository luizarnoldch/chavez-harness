import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Buttons / links under the copy. */
  children?: ReactNode;
  compact?: boolean;
  className?: string;
};

/** Centered muted block (mock `.empty-state`). */
export function EmptyState({
  title,
  description,
  icon: Icon,
  children,
  compact,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-center text-faint",
        compact ? "px-4 py-8" : "px-5 py-12",
        className,
      )}
    >
      {Icon ? <Icon className="mb-2 size-8 opacity-60" strokeWidth={1.5} /> : null}
      <h3 className="text-base text-muted-foreground">{title}</h3>
      {description ? <p className="max-w-[44ch] text-[13px]">{description}</p> : null}
      {children ? <div className="mt-3 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}
