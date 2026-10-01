"use client";

import { Fragment, type ReactNode } from "react";
import { ChevronLeft, LogOut } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";
import { initials, type ShellUser } from "./Rail";
import { ThemeToggle } from "./ThemeToggle";

export type Crumb = {
  label: string;
  /** Omit on the last crumb (the current page). */
  href?: string;
};

export type AppBarProps = {
  title: ReactNode;
  /** Desktop trail (Inicio › Workspace › Sesión). Phones keep the title + back chevron. */
  breadcrumbs?: Crumb[];
  subtitle?: ReactNode;
  /** Parent route: shows a back chevron instead of the brand mark. */
  backHref?: string;
  /** Right-aligned buttons (icon buttons or small text buttons). */
  actions?: ReactNode;
};

type AppBarInternalProps = AppBarProps & {
  user: ShellUser | null;
  onSignOut: () => void;
};

/** Per-view header. On phones it also carries the account menu (no rail there). */
export function AppBar({
  title,
  breadcrumbs,
  subtitle,
  backHref,
  actions,
  user,
  onSignOut,
}: AppBarInternalProps) {
  const trail = breadcrumbs && breadcrumbs.length > 1 ? breadcrumbs : null;
  return (
    <header className="pt-safe relative z-20 flex min-h-[calc(56px+env(safe-area-inset-top,0px))] shrink-0 items-center gap-1 border-b border-border bg-card/95 px-2 backdrop-blur-md backdrop-saturate-150 desk:min-h-14 desk:bg-card desk:px-4 desk:pt-0">
      {backHref ? (
        <a
          href={backHref}
          aria-label="Volver"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground desk:size-9"
        >
          <ChevronLeft className="size-5" />
        </a>
      ) : (
        <span className="flex items-center pl-2 desk:hidden">
          <BrandMark />
        </span>
      )}

      <div className={cn("flex min-w-0 flex-1 flex-col justify-center px-1", !backHref && "pl-2 desk:pl-0")}>
        {trail ? (
          <Breadcrumb className="hidden min-w-0 desk:block">
            <BreadcrumbList className="flex-nowrap gap-1 text-[13px] sm:gap-1">
              {trail.map((crumb, idx) => {
                const last = idx === trail.length - 1;
                return (
                  <Fragment key={`${idx}-${crumb.label}`}>
                    <BreadcrumbItem className="min-w-0">
                      {last || !crumb.href ? (
                        <BreadcrumbPage className="truncate font-heading text-[15px] font-bold">
                          {crumb.label}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.href} className="truncate">
                          {crumb.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {last ? null : <BreadcrumbSeparator />}
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
        <h1
          className={cn(
            "flex items-center gap-2 truncate font-heading text-[17px] leading-tight font-bold",
            trail && "desk:sr-only",
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <div className="flex min-w-0 items-center gap-1 truncate text-xs text-faint">{subtitle}</div>
        ) : null}
      </div>

      {actions ? <div className="flex shrink-0 items-center gap-0.5">{actions}</div> : null}

      {!backHref ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Cuenta y ajustes"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full desk:hidden"
          >
            <span className="inline-flex size-[26px] items-center justify-center rounded-full border border-border bg-muted text-[11px] font-semibold text-muted-foreground">
              {user ? initials(user) : "·"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {user ? (
              <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                {user.email}
              </DropdownMenuLabel>
            ) : null}
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm">
              <span>Modo oscuro</span>
              <ThemeToggle />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onSignOut}>
              <LogOut />
              Salir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </header>
  );
}

/** Icon-only app bar button (44px touch target on phones). */
export function AppBarAction({
  label,
  onClick,
  href,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}) {
  const className =
    "inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground desk:size-9 [&_svg]:size-5";
  if (href) {
    return (
      <a href={href} aria-label={label} title={label} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={className}>
      {children}
    </button>
  );
}
