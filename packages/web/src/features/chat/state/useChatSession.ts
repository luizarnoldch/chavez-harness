"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHAT_GENERATE_TIMEOUT_MS,
  type ChatMessageDto,
  type ChatSessionDto,
  type ChatSessionWithMessagesDto,
  type WorkspaceDto,
} from "@chavez-harness/shared";
import { getSessionWithMessages, getWorkspace } from "@/lib/api";
import { randomId } from "@/lib/uuid";
import type { SocketLive } from "@/lib/ws/shared-socket";
import { markSessionIdle } from "@/lib/ws/user-activity";
import { useChavezSocket, useSocketPush } from "@/lib/ws/useChavezSocket";
import {
  applyGenerateProgress,
  type GenerateProgressData,
  type GenerateStream,
} from "../live/generate-stream";
import { mergeMessages, optimisticUserMessage } from "./messages";

type ChatSendResult = {
  session: ChatSessionDto;
  userMessage: ChatMessageDto;
  assistantMessage: ChatMessageDto;
  created: boolean;
};

export type SendInput = {
  text: string;
  mode: "plan" | "build";
  provider: string;
  model: string;
};

export type SessionSettingsPatch = {
  mode?: "plan" | "build";
  provider?: string;
  model?: string;
};

const CHAT_PUSHES = [
  "session.message.created",
  "session.updated",
  "session.deleted",
  "chat.generate.progress",
] as const;

/**
 * Chat state for one session: REST history, live pushes over the page's
 * shared socket, optimistic send and the in-flight generate stream.
 */
export function useChatSession(sessionId: string): {
  session: ChatSessionWithMessagesDto | null;
  messages: ChatMessageDto[];
  workspace: WorkspaceDto | null;
  live: SocketLive;
  error: string | null;
  sending: boolean;
  stream: GenerateStream | null;
  /** Another client (TUI, other tab) deleted this session. */
  deleted: boolean;
  /** Rejects with a user-facing message; the caller restores the draft. */
  send: (input: SendInput) => Promise<void>;
  /** Persist Plan/Build or the model (`session.update`); peers see it right away. */
  updateSettings: (patch: SessionSettingsPatch) => Promise<void>;
} {
  const [session, setSession] = useState<ChatSessionWithMessagesDto | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [stream, setStream] = useState<GenerateStream | null>(null);
  const [deleted, setDeleted] = useState(false);
  const pendingClientMsgId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getSessionWithMessages(sessionId);
        if (cancelled) return;
        setSession(data);
        setMessages(data.messages);
        const ws = await getWorkspace(data.workspaceId);
        if (!cancelled) setWorkspace(ws);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Error al cargar el chat");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const { socket, live, error: socketError } = useChavezSocket(
    session?.workspaceId ?? null,
    workspace?.path ?? null,
    { chatSessionId: sessionId },
  );

  // After a reconnect, catch up on anything persisted while the socket was down.
  const wasLive = useRef(false);
  const lastSeq = useRef(0);
  lastSeq.current = messages.reduce(
    (max, m) => (m.id.startsWith("optimistic-") ? max : Math.max(max, m.seq)),
    0,
  );
  useEffect(() => {
    if (live !== "live") return;
    if (!wasLive.current) {
      wasLive.current = true;
      return;
    }
    let cancelled = false;
    void getSessionWithMessages(sessionId, lastSeq.current)
      .then((data) => {
        if (cancelled) return;
        setMessages((prev) => mergeMessages(prev, data.messages));
        setSession((prev) => (prev ? { ...prev, ...data, messages: prev.messages } : prev));
        // The reply may have landed while we were offline: drop the stale draft.
        if (data.messages.some((m) => m.role === "assistant")) setStream(null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [live, sessionId]);

  // Safety net for a missed final push: the server gives up on a generate after
  // CHAT_GENERATE_TIMEOUT_MS, so a draft with no progress for longer is stale.
  useEffect(() => {
    if (!stream || sending) return;
    const timer = setTimeout(() => setStream(null), CHAT_GENERATE_TIMEOUT_MS + 10_000);
    return () => clearTimeout(timer);
  }, [stream, sending]);

  useSocketPush(socket, CHAT_PUSHES, (msg) => {
    if (msg.type === "session.message.created") {
      const data = msg.data as { session?: { id?: string }; message?: ChatMessageDto };
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
      if (message.role === "assistant") setStream(null);
    }
    if (msg.type === "session.updated") {
      const data = msg.data as ChatSessionDto;
      if (data.id === sessionId) {
        setSession((prev) => (prev ? { ...prev, ...data } : prev));
      }
    }
    if (msg.type === "session.deleted") {
      const data = msg.data as { chatSessionId?: string };
      if (data.chatSessionId === sessionId) setDeleted(true);
    }
    if (msg.type === "chat.generate.progress") {
      const data = msg.data as GenerateProgressData;
      setStream((prev) => applyGenerateProgress(prev, data, sessionId));
    }
  });

  const send = useCallback(
    async ({ text, mode, provider, model }: SendInput): Promise<void> => {
      if (!socket) throw new Error("Sin enlace al workspace; abre el Host / daemon y recarga.");

      const clientMessageId = randomId();
      pendingClientMsgId.current = clientMessageId;
      const optimistic = optimisticUserMessage(sessionId, text, mode, clientMessageId);

      setSending(true);
      setStream(null);
      setMessages((prev) => [...prev, optimistic]);

      try {
        const result = await socket.request<ChatSendResult>("chat.send", {
          chatSessionId: sessionId,
          text,
          mode,
          provider,
          model,
          clientMessageId,
        });
        pendingClientMsgId.current = null;
        setMessages((prev) =>
          mergeMessages(
            prev.filter((m) => m.id !== `optimistic-${clientMessageId}`),
            [result.userMessage, result.assistantMessage],
          ),
        );
        setSession((prev) => (prev ? { ...prev, ...result.session, messages: prev.messages } : prev));
      } catch (err) {
        pendingClientMsgId.current = null;
        setMessages((prev) => prev.filter((m) => m.id !== `optimistic-${clientMessageId}`));
        throw err;
      } finally {
        setStream(null);
        setSending(false);
        // Our own socket never gets the `session.updated` that closes the turn.
        markSessionIdle(sessionId);
      }
    },
    [socket, sessionId],
  );

  const updateSettings = useCallback(
    async (patch: SessionSettingsPatch): Promise<void> => {
      if (!socket) throw new Error("Sin enlace al workspace; abre el Host / daemon y recarga.");
      const result = await socket.request<{ session: ChatSessionDto }>("session.update", {
        chatSessionId: sessionId,
        ...patch,
      });
      setSession((prev) =>
        prev ? { ...prev, ...result.session, messages: prev.messages } : prev,
      );
    },
    [socket, sessionId],
  );

  return {
    session,
    messages,
    workspace,
    live: loadError ? "offline" : live,
    error: loadError ?? (live === "live" ? null : socketError),
    sending,
    stream,
    deleted,
    send,
    updateSettings,
  };
}
