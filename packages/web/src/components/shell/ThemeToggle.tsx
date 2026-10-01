"use client";

import { Moon, Sun } from "lucide-react";
import { toggleTheme, useResolvedTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

/** Switch styled like the mock's `.switch` (rail footer). */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useResolvedTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Modo oscuro"
      title={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border border-border bg-muted transition-colors",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] left-[2px] flex size-4 items-center justify-center rounded-full transition-transform",
          dark ? "translate-x-4 bg-primary text-primary-foreground" : "bg-faint text-background",
        )}
      >
        {dark ? <Moon className="size-2.5" /> : <Sun className="size-2.5" />}
      </span>
    </button>
  );
}
