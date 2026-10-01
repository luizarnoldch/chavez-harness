"use client";

import { useEffect, type ReactNode } from "react";
import { authClient, signOut } from "@/lib/auth-client";
import { ensureSessionToken, storeSessionToken } from "@/lib/session-token";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AppBar, type AppBarProps } from "./AppBar";
import { Rail, type ShellUser } from "./Rail";
import { TabBar } from "./TabBar";
import type { NavKey } from "./nav-items";

type AppShellProps = AppBarProps & {
  /** Highlighted entry in the rail / tab bar. */
  active: NavKey;
  /** Hide the phone tab bar so the view owns the bottom edge (chat composer). */
  immersive?: boolean;
  /** The view manages its own scroll areas (chat): main never scrolls or pads. */
  fill?: boolean;
  children: ReactNode;
};

/**
 * App chrome from the paperclip-clone mock: rail on desktop (>= 900px),
 * bottom tab bar on phones, per-view app bar. Also the session guard that
 * redirects to /login without a session and calls `ensureSessionToken()`.
 */
export function AppShell({
  active,
  immersive,
  fill,
  children,
  ...bar
}: AppShellProps) {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`/login?next=${next}`);
    }
  }, [isPending, session]);

  useEffect(() => {
    if (isPending || !session) return;
    void ensureSessionToken();
  }, [isPending, session]);

  async function onSignOut() {
    await signOut();
    storeSessionToken(null);
    window.location.assign("/login");
  }

  const ready = !isPending && Boolean(session);
  const user: ShellUser | null = session
    ? { name: session.user.name ?? null, email: session.user.email }
    : null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-dvh flex-col overflow-hidden desk:flex-row">
        <Rail active={active} user={user} onSignOut={() => void onSignOut()} />

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <AppBar {...bar} user={user} onSignOut={() => void onSignOut()} />
          <main
            className={cn(
              "min-h-0 flex-1",
              fill
                ? "flex flex-col overflow-hidden"
                : cn(
                    "overflow-x-hidden overflow-y-auto overscroll-contain px-4 pt-4 sm:px-6 desk:p-6",
                    immersive
                      ? "pb-[calc(env(safe-area-inset-bottom,0px)+2rem)]"
                      : "pb-[calc(58px+env(safe-area-inset-bottom,0px)+2rem)]",
                  ),
            )}
          >
            {ready ? children : <ShellLoading fill={fill} />}
          </main>
        </div>

        <TabBar active={active} hidden={immersive} />
      </div>
    </TooltipProvider>
  );
}

function ShellLoading({ fill }: { fill?: boolean }) {
  return (
    <div
      className={cn("mx-auto flex w-full max-w-[880px] flex-col gap-3", fill && "p-4")}
      aria-busy="true"
      aria-label="Cargando sesión…"
    >
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}

/** Centered page column (mock `.page`). */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto flex w-full max-w-[880px] flex-col gap-5", className)}>
      {children}
    </div>
  );
}
