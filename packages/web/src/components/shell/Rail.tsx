"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Folder, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  generatingCountFor,
  liveWorkspaces,
} from "@/features/dashboard/activity";
import { basename } from "@/lib/format";
import { toggleRail, useRailCollapsed } from "@/lib/rail";
import type { SocketLive } from "@/lib/ws/shared-socket";
import { useUserActivity } from "@/lib/ws/useUserActivity";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";
import {
  ARSENAL_HOME,
  ARSENAL_NAV,
  WORK_NAV,
  type NavItem,
  type NavKey,
} from "./nav-items";

export type ShellUser = {
  name: string | null;
  email: string;
};

type RailProps = {
  active: NavKey;
  user: ShellUser | null;
  onSignOut: () => void;
};

export function initials(user: ShellUser): string {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p.charAt(0)).join("") || "?").toUpperCase();
}

/** Live numbers the rail shows; empty until the activity store has a snapshot. */
type RailActivity = {
  generatingTotal: number;
  /** Workspaces with the daemon online, each with its generating sessions. */
  live: Array<{ id: string; label: string; path: string; generating: number }>;
  machine: "online" | "offline" | null;
  socket: SocketLive | null;
};

const NO_ACTIVITY: RailActivity = { generatingTotal: 0, live: [], machine: null, socket: null };

const RailActivityContext = createContext<RailActivity>(NO_ACTIVITY);

/** Mounted only for signed-in users: it is what opens the page's user-level socket. */
function RailActivityProvider({ children }: { children: ReactNode }) {
  const view = useUserActivity();
  const value = useMemo<RailActivity>(() => {
    if (!view.loaded) {
      return { ...NO_ACTIVITY, socket: view.live };
    }
    return {
      generatingTotal: Object.keys(view.generating).length,
      live: liveWorkspaces(view).map((ws) => ({
        id: ws.id,
        label: basename(ws.path),
        path: ws.path,
        generating: generatingCountFor(view, ws.id),
      })),
      machine: view.machineStatus,
      socket: view.live,
    };
    // `view` is a new object per render; its parts are what actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.loaded, view.generating, view.workspaces, view.machineStatus, view.live]);

  return <RailActivityContext.Provider value={value}>{children}</RailActivityContext.Provider>;
}

function useRailActivity(): RailActivity {
  return useContext(RailActivityContext);
}

/** Brass counter for generating sessions (mock `.live` badge). */
function LiveBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} generando`}
      className={cn(
        "inline-flex min-w-[18px] items-center justify-center rounded-full bg-agent-soft px-1.5 text-[10px] leading-[18px] font-bold text-agent",
        className,
      )}
    >
      {count}
    </span>
  );
}

function RailTooltip({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: ReactNode;
}) {
  // Expanded: the label is already visible, no tooltip.
  if (!collapsed) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function RailLink({
  item,
  active,
  collapsed,
  badge,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  badge?: number;
}) {
  const Icon = item.icon;
  return (
    <RailTooltip label={item.label} collapsed={collapsed}>
      <a
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex min-h-[38px] items-center gap-3 rounded-lg px-2 text-sm font-medium transition-colors rail-collapsed:justify-center",
          active
            ? "bg-primary-soft text-primary-strong"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-[17px] shrink-0" />
        <span className="truncate rail-collapsed:hidden">{item.label}</span>
        {item.soon ? (
          <span className="ml-auto rounded-full border border-border px-1.5 text-[10px] font-semibold text-faint rail-collapsed:hidden">
            Pronto
          </span>
        ) : null}
        {badge ? (
          <>
            <LiveBadge count={badge} className="ml-auto rail-collapsed:hidden" />
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-2 hidden size-2 rounded-full bg-agent rail-collapsed:block"
            />
          </>
        ) : null}
      </a>
    </RailTooltip>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <>
      <p className="mb-1 px-2 text-[11px] font-semibold tracking-[0.06em] text-faint uppercase rail-collapsed:hidden">
        {children}
      </p>
      <div className="mx-2 mb-1 hidden border-t border-border rail-collapsed:block" />
    </>
  );
}

function RailGroup({
  label,
  items,
  active,
  collapsed,
  badges,
}: {
  label: string;
  items: NavItem[];
  active: NavKey;
  collapsed: boolean;
  badges?: Partial<Record<NavKey, number>>;
}) {
  return (
    <div>
      <GroupLabel>{label}</GroupLabel>
      <div className="flex flex-col gap-px">
        {items.map((item) => (
          <RailLink
            key={item.key}
            item={item}
            active={item.key === active}
            collapsed={collapsed}
            badge={badges?.[item.key]}
          />
        ))}
      </div>
    </div>
  );
}

/** "En vivo": workspaces whose daemon is online (mock "Pinned workspaces"). */
function LiveGroup({ collapsed }: { collapsed: boolean }) {
  const { live } = useRailActivity();
  if (live.length === 0) return null;
  const shown = live.slice(0, 6);
  return (
    <div>
      <GroupLabel>En vivo</GroupLabel>
      <div className="flex flex-col gap-px">
        {shown.map((ws) => (
          <RailTooltip
            key={ws.id}
            label={ws.generating > 0 ? `${ws.label} · ${ws.generating} generando` : ws.label}
            collapsed={collapsed}
          >
            <a
              href={`/workspaces/${ws.id}`}
              title={ws.path}
              className="relative flex min-h-[34px] items-center gap-3 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground rail-collapsed:justify-center"
            >
              <span className="relative inline-flex shrink-0">
                <Folder className="size-[17px]" />
                <span
                  aria-hidden="true"
                  className="animate-pulse-dot absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-status-done"
                />
              </span>
              <span className="truncate rail-collapsed:hidden">{ws.label}</span>
              <LiveBadge count={ws.generating} className="ml-auto rail-collapsed:hidden" />
            </a>
          </RailTooltip>
        ))}
        {live.length > shown.length ? (
          <a
            href="/workspaces"
            className="px-2 py-1 text-[11px] font-semibold text-faint hover:text-foreground rail-collapsed:hidden"
          >
            +{live.length - shown.length} más
          </a>
        ) : null}
      </div>
    </div>
  );
}

/** PC / sync indicator for the footer. */
function ConnectionIndicator({ collapsed }: { collapsed: boolean }) {
  const { machine, socket } = useRailActivity();
  if (machine === null && socket === null) return null;

  const synced = socket === "live";
  const machineLabel = machine === "online" ? "PC online" : machine === "offline" ? "PC offline" : "PC…";
  const syncLabel = synced ? "En vivo" : socket === "connecting" ? "Conectando…" : "Sin sync";
  const dot =
    machine === "online" && synced
      ? "bg-status-done"
      : synced || socket === "connecting"
        ? "bg-status-progress"
        : "bg-faint";

  return (
    <RailTooltip label={`${machineLabel} · ${syncLabel}`} collapsed={collapsed}>
      <div
        role="status"
        className="flex items-center gap-2 px-3 pb-2 text-[11px] font-medium text-faint rail-collapsed:justify-center rail-collapsed:px-0"
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-2 shrink-0 rounded-full",
            dot,
            (machine === "online" && synced) || socket === "connecting" ? "animate-pulse-dot" : "",
          )}
        />
        <span className="truncate rail-collapsed:hidden">
          {machineLabel} · {syncLabel}
        </span>
      </div>
    </RailTooltip>
  );
}

function RailBody({ active, user, onSignOut }: RailProps) {
  const collapsed = useRailCollapsed();
  const { generatingTotal } = useRailActivity();

  return (
    <aside className="hidden w-[232px] shrink-0 flex-col overflow-hidden border-r border-border bg-card desk:flex rail-collapsed:w-16">
      <div className="flex min-h-14 items-center gap-1 border-b border-border pr-2 pl-4 rail-collapsed:justify-center rail-collapsed:px-0">
        <a href="/" aria-label="Chavez Harness · Inicio" className="flex min-w-0 flex-1 items-center gap-3 rail-collapsed:flex-none">
          <BrandMark />
          <span className="font-heading text-base font-bold tracking-tight whitespace-nowrap rail-collapsed:hidden">
            Chavez Harness
          </span>
        </a>
      </div>

      <nav aria-label="Secciones" className="flex flex-1 flex-col gap-4 overflow-y-auto p-3 rail-collapsed:px-2">
        <RailGroup
          label="Trabajo"
          items={WORK_NAV}
          active={active}
          collapsed={collapsed}
          badges={{ workspaces: generatingTotal }}
        />
        <LiveGroup collapsed={collapsed} />
        <RailGroup
          label="Arsenal"
          items={[{ ...ARSENAL_HOME, label: "Resumen" }, ...ARSENAL_NAV]}
          active={active}
          collapsed={collapsed}
        />
      </nav>

      <ConnectionIndicator collapsed={collapsed} />

      <div className="border-t border-border p-2">
        <RailTooltip
          label={collapsed ? "Expandir menú" : "Contraer menú"}
          collapsed={collapsed}
        >
          <button
            type="button"
            onClick={toggleRail}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            aria-pressed={collapsed}
            className="flex min-h-8 w-full items-center gap-3 rounded-lg px-2 text-[13px] font-medium text-faint transition-colors hover:bg-muted hover:text-foreground rail-collapsed:justify-center"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4 shrink-0" />
            ) : (
              <PanelLeftClose className="size-4 shrink-0" />
            )}
            <span className="rail-collapsed:hidden">Contraer</span>
          </button>
        </RailTooltip>
      </div>

      <div className="flex items-center gap-2 border-t border-border p-3 rail-collapsed:flex-col rail-collapsed:px-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 p-1 rail-collapsed:flex-none">
          {user ? (
            <>
              <RailTooltip label={user.name?.trim() || user.email} collapsed={collapsed}>
                <span className="inline-flex size-[26px] shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-semibold text-muted-foreground">
                  {initials(user)}
                </span>
              </RailTooltip>
              <span className="min-w-0 rail-collapsed:hidden">
                <span className="block truncate text-[13px] font-medium">
                  {user.name?.trim() || user.email}
                </span>
                {user.name?.trim() ? (
                  <span className="block truncate text-[11px] text-faint">{user.email}</span>
                ) : null}
              </span>
            </>
          ) : (
            <>
              <Skeleton className="size-[26px] rounded-full" />
              <Skeleton className="h-3 w-24 rail-collapsed:hidden" />
            </>
          )}
        </div>
        <ThemeToggle />
        <button
          type="button"
          onClick={onSignOut}
          title="Salir"
          aria-label="Salir"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}

/** Desktop navigation (>= 900px). Phones get the TabBar instead. */
export function Rail(props: RailProps) {
  // The live bits (badges, "En vivo", PC indicator) only exist for a signed-in user:
  // the provider is what opens the user-level socket.
  return props.user ? (
    <RailActivityProvider>
      <RailBody {...props} />
    </RailActivityProvider>
  ) : (
    <RailBody {...props} />
  );
}
