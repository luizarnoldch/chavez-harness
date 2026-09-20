"use client";

import { useEffect, useState } from "react";
import type { ChatSessionDto, WorkspaceDto } from "@chavez-harness/shared";
import { MessageSquareText } from "lucide-react";
import { getWorkspace, listSessions } from "@/lib/api";
import { AuthShell } from "@/features/auth/AuthShell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PresencePanel } from "@/features/workspaces/PresencePanel";
import { useWorkspacePresence } from "@/features/workspaces/useWorkspacePresence";

function formatWhen(iso: string | null): string {
  if (!iso) return "Sin mensajes";
  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function modeLabel(mode: ChatSessionDto["mode"]): string {
  return mode === "build" ? "Build" : "Plan";
}

function modeClass(mode: ChatSessionDto["mode"]): string {
  return mode === "build" ? "text-build" : "text-plan";
}

type SessionsPageProps = {
  workspaceId: string;
};

export function SessionsPage({ workspaceId }: SessionsPageProps) {
  const [workspace, setWorkspace] = useState<WorkspaceDto | null>(null);
  const [sessions, setSessions] = useState<ChatSessionDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    presence,
    activate,
    deactivate,
    controlling,
    controlError,
  } = useWorkspacePresence(workspaceId, workspace?.path ?? null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getWorkspace(workspaceId), listSessions(workspaceId)])
      .then(([ws, list]) => {
        if (cancelled) return;
        setWorkspace(ws);
        setSessions(list);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error al cargar");
        setSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  return (
    <AuthShell title="Sesiones">
      <div className="flex flex-col gap-4">
        <div>
          <a
            href="/workspaces"
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
          >
            ← Workspaces
          </a>
          <h1 className="mt-2 text-lg font-semibold tracking-tight">Sesiones</h1>
          {workspace ? (
            <p className="text-muted-foreground mt-1 truncate font-mono text-xs">{workspace.path}</p>
          ) : null}
        </div>

        <PresencePanel
          presence={presence}
          onActivate={() => void activate()}
          onDeactivate={() => void deactivate()}
          controlling={controlling}
          controlError={controlError}
        />

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {sessions === null ? (
          <p className="text-muted-foreground text-sm">Cargando…</p>
        ) : sessions.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Sin sesiones</CardTitle>
              <CardDescription>
                Crea una conversación desde el TUI en este workspace.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((session) => (
              <li key={session.id}>
                <a
                  href={`/sessions/${session.id}`}
                  className="block rounded-xl border border-border/80 bg-card px-4 py-3 transition-colors hover:border-primary/50 hover:bg-accent/40"
                >
                  <div className="flex items-start gap-3">
                    <MessageSquareText className="text-primary mt-0.5 size-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {session.title?.trim() || "Sesión sin título"}
                        </p>
                        <span className={`shrink-0 text-xs font-medium ${modeClass(session.mode)}`}>
                          {modeLabel(session.mode)}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatWhen(session.lastMessageAt)} · {session.provider}/{session.model}
                      </p>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AuthShell>
  );
}
