"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ProviderCredentialStatus } from "@chavez-harness/shared";
import { CircleAlert, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { listProviderCredentials } from "@/lib/api";
import { basename } from "@/lib/format";
import { useWorkspacePresence } from "@/features/workspaces/useWorkspacePresence";
import { Composer } from "./composer/Composer";
import type { ChatMode } from "./composer/ModePill";
import type { ModelChoice } from "./composer/model-options";
import { ChatHeader } from "./header/ChatHeader";
import { SyncBadge } from "./header/SyncBadge";
import { WorkingStatus } from "./live/WorkingStatus";
import { useChatSession } from "./state/useChatSession";
import { Transcript } from "./transcript/Transcript";

type ChatPageProps = {
  sessionId: string;
};

/** Keep following new output only while the reader is near the bottom. */
const STICK_THRESHOLD_PX = 160;

export function ChatPage({ sessionId }: ChatPageProps) {
  const chat = useChatSession(sessionId);
  const { session, workspace, messages, stream, sending, live } = chat;

  const presence = useWorkspacePresence(session?.workspaceId ?? null, workspace?.path ?? null);

  const [mode, setMode] = useState<ChatMode>("plan");
  const [model, setModel] = useState<ModelChoice | null>(null);
  const [credentials, setCredentials] = useState<ProviderCredentialStatus[] | null>(null);

  // Composer follows the persisted session until the user picks something else;
  // a session.updated from the TUI (or our own send) re-syncs it.
  useEffect(() => {
    if (!session) return;
    setMode(session.mode);
    setModel({ provider: session.provider, model: session.model });
  }, [session?.mode, session?.provider, session?.model]);

  useEffect(() => {
    let cancelled = false;
    void listProviderCredentials()
      .then((list) => {
        if (!cancelled) setCredentials(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
  }

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, stream, sending]);

  const missingCursorKey =
    model?.provider === "cursor" &&
    credentials !== null &&
    !credentials.some((c) => c.provider === "cursor" && c.configured);

  const generating = sending || stream !== null;
  const workspaceHref = session ? `/workspaces/${session.workspaceId}` : "/workspaces";

  // Deleted from the TUI or another tab: say so, then leave for the workspace.
  useEffect(() => {
    if (!chat.deleted) return;
    toast.info("Esta sesión se eliminó desde otro cliente.");
    const timer = setTimeout(() => window.location.replace(workspaceHref), 1200);
    return () => clearTimeout(timer);
  }, [chat.deleted, workspaceHref]);

  // Plan/Build and model are shared state: persist right away so the TUI follows.
  async function onModeChange(next: ChatMode) {
    const previous = mode;
    setMode(next);
    try {
      await chat.updateSettings({ mode: next });
    } catch (err) {
      setMode(previous);
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar el modo");
    }
  }

  async function onModelChange(next: ModelChoice) {
    const previous = model;
    setModel(next);
    try {
      await chat.updateSettings({ provider: next.provider, model: next.model });
    } catch (err) {
      setModel(previous);
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar el modelo");
    }
  }

  async function onSend(text: string) {
    if (!session || !model) return;
    if (live !== "live") {
      toast.error("Sin enlace al workspace; abre el Host / daemon y recarga.");
      throw new Error("not live");
    }
    stickRef.current = true;
    try {
      await chat.send({ text, mode, provider: model.provider, model: model.model });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar");
      throw err;
    }
  }

  const title = session?.title?.trim() || "Chat";

  return (
    <AppShell
      active="workspaces"
      title={title}
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: workspace ? basename(workspace.path) : "Workspace", href: workspaceHref },
        { label: title },
      ]}
      subtitle={
        <>
          <SyncBadge live={live} size="sm" />
          {workspace ? <span className="truncate">· {basename(workspace.path)}</span> : null}
        </>
      }
      backHref={workspaceHref}
      immersive
      fill
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
        >
          <div className="mx-auto flex w-full max-w-[820px] flex-col gap-3 px-4 pt-3 pb-6 sm:px-6">
            {session ? (
              <ChatHeader
                session={session}
                workspace={workspace}
                mode={mode}
                live={live}
                presence={presence.presence}
                onActivate={() => void presence.activate()}
                onDeactivate={() => void presence.deactivate()}
                controlling={presence.controlling}
                controlError={presence.controlError}
              />
            ) : chat.error ? null : (
              <Skeleton className="h-36 w-full rounded-xl" />
            )}

            {chat.error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive-soft px-4 py-3 text-[13px]"
              >
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                <span>{chat.error}</span>
              </div>
            ) : null}

            {session ? <Transcript messages={messages} stream={stream} /> : null}
            <WorkingStatus stream={stream} sending={sending} />
          </div>
        </div>

        <div className="pb-safe shrink-0 border-t border-border bg-card/95 px-3 pt-2 backdrop-blur-md sm:px-4">
          <div className="mx-auto flex w-full max-w-[820px] flex-col gap-2 pb-2">
            {missingCursorKey ? (
              <div className="flex items-start gap-2 rounded-lg border border-status-progress/40 bg-status-progress-soft px-3 py-2 text-[13px]">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-status-progress" />
                <span>
                  Falta la API key de Cursor.{" "}
                  <a href="/arsenal/providers" className="font-semibold text-primary underline underline-offset-2">
                    Conéctala en Proveedores
                  </a>{" "}
                  o elige el modelo local <code className="font-mono">eco</code>.
                </span>
              </div>
            ) : null}
            {model ? (
              <Composer
                mode={mode}
                onModeChange={(next) => void onModeChange(next)}
                model={model}
                onModelChange={(next) => void onModelChange(next)}
                onSend={onSend}
                disabled={!session || live !== "live"}
                busy={generating}
                placeholder={
                  generating
                    ? "El agente está trabajando…"
                    : live === "live"
                      ? "Escribe un mensaje…"
                      : "Esperando enlace con el workspace…"
                }
              />
            ) : (
              <Skeleton className="h-[84px] w-full rounded-[18px]" />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
