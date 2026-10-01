"use client";

import { cn } from "@/lib/utils";
import { sectionOf, TAB_NAV, type NavKey } from "./nav-items";

type TabBarProps = {
  active: NavKey;
  /** Chat composer owns the bottom edge: slide the bar away. */
  hidden?: boolean;
};

/** Bottom tab bar on phones (< 900px). */
export function TabBar({ active, hidden }: TabBarProps) {
  const section = sectionOf(active);
  return (
    <nav
      aria-label="Secciones"
      className={cn(
        "pb-safe fixed inset-x-0 bottom-0 z-30 grid h-[calc(58px+env(safe-area-inset-bottom,0px))] grid-cols-4 border-t border-border bg-card/95 backdrop-blur-md backdrop-saturate-150 transition-transform duration-200 desk:hidden",
        hidden && "translate-y-[110%]",
      )}
    >
      {TAB_NAV.map((item) => {
        const Icon = item.icon;
        const isActive = item.key === section;
        return (
          <a
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center justify-center gap-[3px] text-[11px] font-semibold tracking-[0.01em] [-webkit-tap-highlight-color:transparent]",
              isActive ? "text-primary-strong" : "text-faint",
            )}
          >
            {isActive ? (
              <span className="absolute top-0 h-[3px] w-7 rounded-b-[3px] bg-primary" />
            ) : null}
            <Icon className="size-[22px]" />
            <span>{item.shortLabel ?? item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
