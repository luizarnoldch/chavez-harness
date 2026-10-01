"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatSessionDto, WorkspaceDto } from "@chavez-harness/shared";
import { Folder, MessageSquareText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { ListGroup } from "@/components/common/Section";
import { modeLabel, modeTone, StatusPill } from "@/components/common/StatusPill";
import { AppBarAction } from "@/components/shell/AppBar";
import { AppShell, Page } from "@/components/shell/AppShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteSession, getWorkspace, listSessions } from "@/lib/api";
import { basename, formatAgo, prettyPath } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChavezSocket, useSocketPush } from "@/lib/ws/useChavezSocket";
import { PresencePanel } from "@/features/workspaces/PresencePanel";
import { useWorkspacePresence } from "@/features/workspaces/useWorkspacePresence";
import { NewSessionSheet } from "./NewSessionSheet";

type ModeFilter = "all" | "plan" | "build";

const FILTERS: { value: ModeFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "plan", label: "Plan" },
  { value: "build", label: "Build" },
];

/** A session counts as working while progress pushes keep arriving. */
const RUNNING_TTL_MS = 60_000;

/** Match REST listSessions: lastMessageAt desc, then createdAt desc. */
function sortSessions(sessions: ChatSessionDto[]): ChatSessionDto[] {
  return [...sessions].sort((a, b) => {
    const aMsg = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const bMsg = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    if (bMsg !== aMsg) return bMsg - aMsg;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

function upsertSession(prev: ChatSessionDto[] | null, session: ChatSessionDto): ChatSessionDto[] {
  const list = prev ?? [];
  const idx = list.findIndex((s) => s.id === session.id);
  const next = idx >= 0 ? list.map((s, i) => (i === idx ? session : s)) : [session, ...list];
  return sortSessions(next);
}

type SessionsPageProps = {
  workspaceId: string;
};

export function SessionsPage({ workspaceId }: SessionsPageProps) {
  const [workspace, setWorkspace] = useState<WorkspaceDto | null>(null);
  const [sessions, setSessions] = useState<ChatSessionDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ModeFilter>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ChatSessionDto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [running, setRunning] = useState<Record<string, number>>({});

  const onSessionUpdated = useCallback((session: ChatSessionDto) => {
    setSessions((prev) => upsertSession(prev, session));
    // session.updated lands after the reply is persisted: the turn is over.
    setRunning((prev) => {
      if (!(session.id in prev)) return prev;
      const { [session.id]: _done, ...rest } = prev;
      return rest;
    });
  }, []);

  const onSessionDeleted = useCallback((payload: { workspaceId: string; chatSessionId: string }) => {
    setSessions((prev) => (prev ? prev.filter((s) => s.id !== payload.chatSessionId) : prev));
  }, []);

  const { presence, activate, deactivate, controlling, controlError } = useWorkspacePresence(
    workspaceId,
    workspace?.path ?? null,
    { onSessionUpdated, onSessionDeleted },
  );

  // Same page socket as presence: mark sessions with a generation in flight.
  // The socket also carries other workspaces' events (user.subscribe): filter by ours.
  const { socket } = useChavezSocket(workspaceId, workspace?.path ?? null);
  useSocketPush(socket, ["chat.generate.progress"], (msg) => {
    const data = msg.data as { sessionId?: string; workspaceId?: string };
    if (data.sessionId && data.workspaceId === workspaceId) {
      const id = data.sessionId;
      setRunning((prev) => ({ ...prev, [id]: Date.now() }));
    }
  });

  useEffect(() => {
    if (Object.keys(running).length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setRunning((prev) => {
        const next = Object.fromEntries(
          Object.entries(prev).filter(([, at]) => now - at < RUNNING_TTL_MS),
        );
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 5_000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getWorkspace(workspaceId), listSessions(workspaceId)])
      .then(([ws, list]) => {
        if (cancelled) return;
        setWorkspace(ws);
        setSessions(sortSessions(list));
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

  async function confirmDelete() {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    setDeletingId(target.id);
    try {
      await deleteSession(target.id);
      setSessions((prev) => (prev ? prev.filter((s) => s.id !== target.id) : prev));
      toast.success("Sesión eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar la sesión");
    } finally {
      setDeletingId(null);
    }
  }

  const all = sessions ?? [];
  const counts: Record<ModeFilter, number> = {
    all: all.length,
    plan: all.filter((s) => s.mode === "plan").length,
    build: all.filter((s) => s.mode === "build").length,
  };
  const shown = filter === "all" ? all : all.filter((s) => s.mode === filter);
  const runningCount = Object.keys(running).length;

  return (
    <AppShell
      active="workspaces"
      title={workspace ? basename(workspace.path) : "Sesiones"}
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Workspaces", href: "/workspaces" },
        { label: workspace ? basename(workspace.path) : "Sesiones" },
      ]}
      subtitle={
        workspace ? (
          <span className="truncate font-mono">
            {prettyPath(workspace.path)}
            {runningCount ? ` · ${runningCount} trabajando` : ""}
          </span>
        ) : undefined
      }
      backHref="/workspaces"
      actions={
        <AppBarAction label="Nueva sesión" onClick={() => setSheetOpen(true)}>
          <Plus />
        </AppBarAction>
      }
    >
      {/* bottom room so the last row can scroll above the FAB */}
      <Page className="pb-16">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground">
            <Folder className="size-4 shrink-0" />
            {workspace ? (
              <span className="truncate font-mono" title={workspace.path}>
                {workspace.path}
              </span>
            ) : (
              <Skeleton className="h-4 w-56" />
            )}
          </div>
          <PresencePanel
            presence={presence}
            onActivate={() => void activate()}
            onDeactivate={() => void deactivate()}
            controlling={controlling}
            controlError={controlError}
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div role="tablist" aria-label="Filtrar por modo" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={cn(
                "inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap transition-colors",
                filter === item.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              <span className="text-[11px] tabular-nums opacity-70">{counts[item.value]}</span>
            </button>
          ))}
        </div>

        {sessions === null ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-[84px] w-full rounded-xl" />
            <Skeleton className="h-[84px] w-full rounded-xl" />
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title={filter === "all" ? "Sin sesiones todavía" : "Nada por aquí"}
            description={
              filter === "all"
                ? "Crea una con «Nueva sesión» o desde el TUI en esta carpeta."
                : `No hay sesiones en modo ${modeLabel(filter)} en este workspace.`
            }
          />
        ) : (
          <ListGroup>
            {shown.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                running={session.id in running}
                deleting={deletingId === session.id}
                onDelete={() => setPendingDelete(session)}
              />
            ))}
          </ListGroup>
        )}
      </Page>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="fixed right-4 bottom-[calc(58px+env(safe-area-inset-bottom,0px)+1rem)] z-20 inline-flex h-[52px] items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-[var(--shadow-lg)] desk:right-6 desk:bottom-6"
      >
        <Plus className="size-5" />
        Nueva sesión
      </button>

      <NewSessionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        workspaceId={workspaceId}
        workspacePath={workspace?.path ?? null}
      />

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra «{pendingDelete?.title?.trim() || "Sesión sin título"}» con todo su historial,
              también para el TUI. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void confirmDelete()}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

type SessionCardProps = {
  session: ChatSessionDto;
  running: boolean;
  deleting: boolean;
  onDelete: () => void;
};

/** Row in the sessions list (mock `transcript.sessionCard`). */
function SessionCard({ session, running, deleting, onDelete }: SessionCardProps) {
  return (
    <div className="relative flex items-start gap-1 pr-2 transition-colors hover:bg-muted/60">
      {running ? (
        <span aria-hidden="true" className="absolute top-3 bottom-3 left-0 w-[3px] rounded-r-[3px] bg-agent" />
      ) : null}
      <a href={`/sessions/${session.id}`} className="flex min-w-0 flex-1 gap-3 py-3 pl-4">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-agent-soft text-agent">
          <MessageSquareText className="size-[18px]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-faint">
              {session.provider} · {session.model}
            </span>
            {running ? (
              <StatusPill size="sm" tone="progress" pulse>
                Trabajando
              </StatusPill>
            ) : null}
            <StatusPill size="sm" tone={modeTone(session.mode)}>
              {modeLabel(session.mode)}
            </StatusPill>
          </span>
          <span className="line-clamp-2 leading-snug font-semibold">
            {session.title?.trim() || "Sesión sin título"}
          </span>
          <span className="text-[11px] text-faint">
            {session.lastMessageAt ? `Último mensaje ${formatAgo(session.lastMessageAt)}` : "Sin mensajes"}
          </span>
        </span>
      </a>
      <button
        type="button"
        title="Eliminar sesión"
        aria-label="Eliminar sesión"
        disabled={deleting}
        onClick={onDelete}
        className="mt-3 inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-destructive-soft hover:text-destructive disabled:opacity-50"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
