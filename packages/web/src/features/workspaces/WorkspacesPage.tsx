"use client";

import { useEffect, useState } from "react";
import type { WorkspaceDto } from "@chavez-harness/shared";
import { FolderGit2 } from "lucide-react";
import { getMachineStatus, listWorkspaces } from "@/lib/api";
import { AuthShell } from "@/features/auth/AuthShell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [machineOnline, setMachineOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listWorkspaces(), getMachineStatus()])
      .then(([list, machine]) => {
        if (cancelled) return;
        setWorkspaces(list);
        setMachineOnline(machine.status === "online");
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar");
          setWorkspaces([]);
          setMachineOnline(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthShell title="Workspaces">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Workspaces activos</h1>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Rutas locales con daemon latente. Requiere el Host en tu PC para activarlos.
          </p>
        </div>

        {machineOnline === false ? (
          <Card className="border-destructive/40 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">PC offline</CardTitle>
              <CardDescription>
                El Host no está conectado. Arranca el TUI o{" "}
                <code className="text-xs">bun run headless workspace host</code> en tu máquina
                antes de entrar a un workspace.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : machineOnline === true ? (
          <p className="text-build text-xs font-medium">PC online · Host conectado</p>
        ) : null}

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {workspaces === null ? (
          <p className="text-muted-foreground text-sm">Cargando…</p>
        ) : workspaces.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Sin workspaces</CardTitle>
              <CardDescription>
                Abre el TUI en un proyecto o enlaza un path para registrarlo aquí. El daemon queda
                latente hasta que lo actives.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                {machineOnline ? (
                  <a
                    href={`/workspaces/${ws.id}`}
                    className="block rounded-xl border border-border/80 bg-card px-4 py-3 transition-colors hover:border-primary/50 hover:bg-accent/40"
                  >
                    <WorkspaceRow ws={ws} />
                  </a>
                ) : (
                  <div className="block rounded-xl border border-border/40 bg-card/50 px-4 py-3 opacity-60">
                    <WorkspaceRow ws={ws} />
                    <p className="text-muted-foreground mt-2 text-xs">
                      Enciende el Host para entrar
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AuthShell>
  );
}

function WorkspaceRow({ ws }: { ws: WorkspaceDto }) {
  return (
    <div className="flex items-start gap-3">
      <FolderGit2 className="text-primary mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm leading-snug">{ws.path}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Activo {formatWhen(ws.lastActiveAt)}
          {ws.daemonDesired === "on" ? " · daemon deseado on" : " · daemon off"}
        </p>
      </div>
    </div>
  );
}
