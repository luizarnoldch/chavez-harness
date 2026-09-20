"use client";

import { useEffect, type ReactNode } from "react";
import { authClient, signOut } from "@/lib/auth-client";
import { storeSessionToken } from "@/lib/session-token";
import { Button } from "@/components/ui/button";

type AuthShellProps = {
  children: ReactNode;
  title?: string;
};

export function AuthShell({ children, title }: AuthShellProps) {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      const next = encodeURIComponent(window.location.pathname);
      window.location.replace(`/login?next=${next}`);
    }
  }, [isPending, session]);

  async function onSignOut() {
    await signOut();
    storeSessionToken(null);
    window.location.assign("/login");
  }

  if (isPending || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-muted-foreground text-sm">Cargando sesión…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium tracking-tight">
              {title ?? "Chavez"}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {session.user.email}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void onSignOut()}>
            Salir
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
