"use client";

import { useEffect, useState } from "react";
import type { ChatSessionDto, WorkspaceDto } from "@chavez-harness/shared";
import { MessageSquareText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createSession, deleteSession, getWorkspace, listSessions } from "@/lib/api";
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

function modeHint(mode: ChatSessionDto["mode"]): string {
  return mode === "build" ? "herramientas completas" : "solo lectura";
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
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  async function onCreateSession() {
    setCreating(true);
    setError(null);
    try {
      const session = await createSession(workspaceId);
      window.location.href = `/sessions/${session.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la sesión");
      setCreating(false);
    }
  }

  async function onDeleteSession(sessionId: string) {
    setDeletingId(sessionId);
    setError(null);
    try {
      await deleteSession(sessionId);
      setSessions((prev) => (prev ? prev.filter((s) => s.id !== sessionId) : prev));
      toast.success("Sesión eliminada");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar la sesión";
      setError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AuthShell title="Sesiones">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <a
              href="/workspaces"
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
            >
              ← Workspaces
            </a>
            <h1 className="mt-2 text-lg font-semibold tracking-tight">Sesiones</h1>
            {workspace ? (
              <p className="text-muted-foreground mt-1 truncate font-mono text-xs">
                {workspace.path}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={creating}
            onClick={() => void onCreateSession()}
            className="bg-primary text-primary-foreground inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            {creating ? "Creando…" : "Nueva sesión"}
          </button>
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
                Crea una conversación con «Nueva sesión» para empezar a chatear.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="rounded-xl border border-border/80 bg-card px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <a
                    href={`/sessions/${session.id}`}
                    className="flex min-w-0 flex-1 items-start gap-3 transition-colors hover:opacity-90"
                  >
                    <MessageSquareText className="text-primary mt-0.5 size-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {session.title?.trim() || "Sesión sin título"}
                        </p>
                        <span
                          className={`shrink-0 text-xs font-medium ${modeClass(session.mode)}`}
                        >
                          {modeLabel(session.mode)} · {modeHint(session.mode)}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatWhen(session.lastMessageAt)} · {session.provider}/{session.model}
                      </p>
                    </div>
                  </a>
                  <button
                    type="button"
                    title="Eliminar sesión"
                    disabled={deletingId === session.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void onDeleteSession(session.id);
                    }}
                    className="text-destructive hover:bg-destructive/10 inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AuthShell>
  );
}
