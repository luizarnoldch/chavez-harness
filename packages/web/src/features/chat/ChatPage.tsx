"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type {
  ChatMessageDto,
  ChatSessionDto,
  ChatSessionWithMessagesDto,
} from "@chavez-harness/shared";
import { toast } from "sonner";
import { getSessionWithMessages, getWorkspace } from "@/lib/api";
import { ChavezWsClient } from "@/lib/ws-client";
import { AuthShell } from "@/features/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PresencePanel } from "@/features/workspaces/PresencePanel";
import { useWorkspacePresence } from "@/features/workspaces/useWorkspacePresence";
import { ChatMarkdown, ChatMarkdownStyles } from "@/features/chat/markdown/ChatMarkdown";

function textFromParts(parts: ChatMessageDto["parts"]): string {
  return parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();
}

function mergeMessages(
  current: ChatMessageDto[],
  incoming: ChatMessageDto[],
): ChatMessageDto[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const msg of incoming) {
    byId.set(msg.id, msg);
  }
  return [...byId.values()].sort((a, b) => a.seq - b.seq);
}

function optimisticUserMessage(
  sessionId: string,
  text: string,
  mode: "plan" | "build",
  clientMessageId: string,
): ChatMessageDto {
  return {
    id: `optimistic-${clientMessageId}`,
    chatSessionId: sessionId,
    role: "user",
    mode,
    provider: null,
    model: null,
    status: "pending",
    error: null,
    parts: [{ type: "text", text }],
    usage: null,
    clientMessageId,
    seq: Number.MAX_SAFE_INTEGER - 1,
    createdAt: new Date().toISOString(),
  };
}

type ChatSendResult = {
  session: ChatSessionDto;
  userMessage: ChatMessageDto;
  assistantMessage: ChatMessageDto;
  created: boolean;
};

type ChatPageProps = {
  sessionId: string;
};

export function ChatPage({ sessionId }: ChatPageProps) {
  const [session, setSession] = useState<ChatSessionWithMessagesDto | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [streamDraft, setStreamDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<ChavezWsClient | null>(null);
  const pendingClientMsgId = useRef<string | null>(null);

  const {
    presence,
    activate,
    deactivate,
    controlling,
    controlError,
  } = useWorkspacePresence(session?.workspaceId ?? null, workspacePath);

  const mode = session?.mode ?? "plan";

  const load = useCallback(async () => {
    const data = await getSessionWithMessages(sessionId);
    setSession(data);
    setMessages(data.messages);
    return data;
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    void load().catch((err: unknown) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : "Error al cargar el chat");
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!session?.workspaceId) return;

    let cancelled = false;
    const workspaceId = session.workspaceId;

    const client = new ChavezWsClient({
      autoReconnect: true,
      onPush: (msg) => {
        if (msg.type === "session.message.created") {
          const data = msg.data as {
            session?: { id?: string };
            message?: ChatMessageDto;
          };
          if (data.session?.id !== sessionId || !data.message) return;
          const message = data.message;
          setMessages((prev) => {
            let next = prev;
            if (
              message.role === "user" &&
              message.clientMessageId &&
              pendingClientMsgId.current === message.clientMessageId
            ) {
              next = prev.filter((m) => m.id !== `optimistic-${message.clientMessageId}`);
              pendingClientMsgId.current = null;
            }
            return mergeMessages(next, [message]);
          });
          if (message.role === "assistant") {
            setStreamDraft("");
          }
        }
        if (msg.type === "session.updated") {
          const data = msg.data as { id?: string };
          if (data.id === sessionId) {
            setSession((prev) => (prev ? { ...prev, ...data } : prev));
          }
        }
        if (msg.type === "chat.generate.progress") {
          const data = msg.data as {
            sessionId?: string;
            phase?: string;
            textDelta?: string;
          };
          if (data.sessionId !== sessionId) return;
          if (data.phase === "streaming" && data.textDelta) {
            setStreamDraft((prev) => prev + data.textDelta);
          }
          if (data.phase === "done" || data.phase === "error") {
            setStreamDraft("");
          }
        }
      },
    });
    clientRef.current = client;

    void (async () => {
      try {
        const workspace = await getWorkspace(workspaceId);
        if (cancelled) return;
        setWorkspacePath(workspace.path);
        await client.connect();
        if (cancelled) return;
        await client.request("workspace.bind", {
          path: workspace.path,
          clientKind: "client",
        });
        if (cancelled) return;
        await client.request("workspace.sync", {
          workspaceId,
          chatSessionId: sessionId,
        });
        if (cancelled) return;
        setLive("live");
      } catch {
        if (!cancelled) setLive("offline");
      }
    })();

    return () => {
      cancelled = true;
      client.close();
      if (clientRef.current === client) clientRef.current = null;
    };
  }, [session?.workspaceId, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamDraft]);

  const title = useMemo(
    () => session?.title?.trim() || "Chat",
    [session?.title],
  );

  async function onSend(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    const client = clientRef.current;
    if (!client || live !== "live") {
      toast.error("Sin enlace al workspace; abre el Host / daemon y recarga.");
      return;
    }

    const clientMessageId = crypto.randomUUID();
    pendingClientMsgId.current = clientMessageId;
    const optimistic = optimisticUserMessage(sessionId, text, mode, clientMessageId);

    setSending(true);
    setStreamDraft("");
    setDraft("");
    setMessages((prev) => [...prev, optimistic]);

    try {
      const result = await client.request<ChatSendResult>("chat.send", {
        chatSessionId: sessionId,
        text,
        mode,
        clientMessageId,
      });
      pendingClientMsgId.current = null;
      setMessages((prev) => {
        const withoutOptimistic = prev.filter(
          (m) => m.id !== `optimistic-${clientMessageId}`,
        );
        return mergeMessages(withoutOptimistic, [
          result.userMessage,
          result.assistantMessage,
        ]);
      });
      setSession((prev) =>
        prev ? { ...prev, ...result.session, messages: prev.messages } : prev,
      );
      setStreamDraft("");
    } catch (err) {
      pendingClientMsgId.current = null;
      setMessages((prev) =>
        prev.filter((m) => m.id !== `optimistic-${clientMessageId}`),
      );
      setDraft(text);
      setStreamDraft("");
      toast.error(err instanceof Error ? err.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthShell title={title}>
      <div className="flex h-[calc(100dvh-3.5rem-2.5rem)] flex-col gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <a
              href={session ? `/workspaces/${session.workspaceId}` : "/workspaces"}
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
            >
              ← Sesiones
            </a>
            <span
              className={
                live === "live"
                  ? "text-build text-xs"
                  : live === "connecting"
                    ? "text-muted-foreground text-xs"
                    : "text-destructive text-xs"
              }
            >
              {live === "live" ? "En vivo" : live === "connecting" ? "Conectando…" : "Sin sync"}
            </span>
          </div>
          <PresencePanel
            presence={presence}
            compact
            onActivate={() => void activate()}
            onDeactivate={() => void deactivate()}
            controlling={controlling}
            controlError={controlError}
          />
          <p className="text-muted-foreground text-[11px] leading-snug">
            Modo {mode === "build" ? "Build" : "Plan"}:{" "}
            {mode === "build"
              ? "herramientas completas del agente (lectura, edición, shell, web…)."
              : "solo lectura (sin escritura ni shell)."}{" "}
            El TUI muestra el chat en vivo solo si tiene abierta esta misma sesión.
          </p>
        </div>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border/80 bg-card/40 px-3 py-3">
          <ChatMarkdownStyles />
          {messages.length === 0 && !streamDraft ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Sin mensajes todavía. Escribe abajo o usa el TUI.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {messages.map((msg) => {
                const body = textFromParts(msg.parts);
                const isUser = msg.role === "user";
                return (
                  <li
                    key={msg.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {!isUser ? (
                        <p className="mb-1 text-[10px] font-medium tracking-wide uppercase opacity-70">
                          Asistente
                          {msg.mode ? ` · ${msg.mode}` : ""}
                        </p>
                      ) : null}
                      {body ? (
                        isUser ? (
                          body
                        ) : (
                          <ChatMarkdown source={body} />
                        )
                      ) : (
                        <span className="opacity-60">
                          {msg.status === "pending" ? "…" : "(sin texto)"}
                        </span>
                      )}
                      {msg.error ? (
                        <p className="mt-2 text-xs text-red-300">{msg.error}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
              {streamDraft ? (
                <li className="flex justify-start">
                  <div className="bg-secondary text-secondary-foreground max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed">
                    <p className="mb-1 text-[10px] font-medium tracking-wide uppercase opacity-70">
                      Asistente
                    </p>
                    <ChatMarkdown source={streamDraft} />
                    <span className="ml-0.5 inline-block animate-pulse">▍</span>
                  </div>
                </li>
              ) : null}
            </ul>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSend} className="flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe un mensaje…"
            rows={3}
            className="min-h-20 resize-none text-base"
            disabled={sending || !session || live !== "live"}
          />
          <Button
            type="submit"
            className="h-11 w-full"
            disabled={sending || live !== "live" || !draft.trim()}
          >
            {sending ? "Enviando…" : "Enviar"}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
