import type {
  ChatMessageDto,
  ChatSessionDto,
  ChatSessionWithMessagesDto,
  WorkspaceDto,
} from "@chavez-harness/shared";
import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_CHAT_PROVIDER,
} from "@chavez-harness/shared";
import {
  ChatNotFoundError,
  type ChatService,
  type SendMessageInput,
  type SendMessageResult,
  type WorkspaceService,
} from "../src/services/chat.ts";

export function createMemoryWorkspaceService(): WorkspaceService {
  const byKey = new Map<string, WorkspaceDto>();
  const byId = new Map<string, WorkspaceDto>();

  return {
    async upsertByPath(userId, path) {
      const key = `${userId}:${path}`;
      const existing = byKey.get(key);
      const now = new Date().toISOString();
      if (existing) {
        const updated = { ...existing, lastActiveAt: now, updatedAt: now };
        byKey.set(key, updated);
        byId.set(updated.id, updated);
        return updated;
      }
      const created: WorkspaceDto = {
        id: crypto.randomUUID(),
        userId,
        path,
        daemonDesired: "off",
        daemonDesiredSource: null,
        createdAt: now,
        updatedAt: now,
        lastActiveAt: now,
      };
      byKey.set(key, created);
      byId.set(created.id, created);
      return created;
    },
    async getForUser(userId, workspaceId) {
      const ws = byId.get(workspaceId);
      if (!ws || ws.userId !== userId) return null;
      return ws;
    },
    async listForUser(userId) {
      return [...byId.values()].filter((w) => w.userId === userId);
    },
    async touch(workspaceId) {
      const ws = byId.get(workspaceId);
      if (!ws) return;
      const now = new Date().toISOString();
      const updated = { ...ws, lastActiveAt: now, updatedAt: now };
      byId.set(workspaceId, updated);
      byKey.set(`${ws.userId}:${ws.path}`, updated);
    },
    async setDaemonDesired(userId, workspaceId, desired, source) {
      const existing = await this.getForUser(userId, workspaceId);
      if (!existing) throw new Error("Workspace no encontrado");

      if (
        desired === "off" &&
        existing.daemonDesired === "on" &&
        existing.daemonDesiredSource === "web" &&
        source === "tui"
      ) {
        return { workspace: existing, ignored: true };
      }

      let sourceToStore: WorkspaceDto["daemonDesiredSource"] =
        desired === "off" ? null : source;
      if (
        desired === "on" &&
        existing.daemonDesired === "on" &&
        existing.daemonDesiredSource === "web" &&
        source === "tui"
      ) {
        sourceToStore = "web";
      }

      const now = new Date().toISOString();
      const updated: WorkspaceDto = {
        ...existing,
        daemonDesired: desired,
        daemonDesiredSource: sourceToStore,
        updatedAt: now,
        lastActiveAt: now,
      };
      byId.set(workspaceId, updated);
      byKey.set(`${userId}:${existing.path}`, updated);
      return { workspace: updated, ignored: false };
    },
  };
}

export function createMemoryChatService(workspaces: WorkspaceService): ChatService {
  const sessions = new Map<string, ChatSessionDto>();
  const messages = new Map<string, ChatMessageDto[]>();

  return {
    async createSession(userId, workspaceId, input = {}) {
      const ws = await workspaces.getForUser(userId, workspaceId);
      if (!ws) throw new ChatNotFoundError("Workspace no encontrado");
      const now = new Date().toISOString();
      const session: ChatSessionDto = {
        id: crypto.randomUUID(),
        workspaceId,
        title: input.title ?? null,
        mode: input.mode ?? "plan",
        provider: input.provider ?? DEFAULT_CHAT_PROVIDER,
        model: input.model ?? DEFAULT_CHAT_MODEL,
        createdAt: now,
        updatedAt: now,
        lastMessageAt: null,
      };
      sessions.set(session.id, session);
      messages.set(session.id, []);
      return session;
    },
    async listSessions(userId, workspaceId) {
      const ws = await workspaces.getForUser(userId, workspaceId);
      if (!ws) throw new ChatNotFoundError("Workspace no encontrado");
      return [...sessions.values()]
        .filter((s) => s.workspaceId === workspaceId)
        .sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt));
    },
    async getLatestOrCreate(userId, workspaceId) {
      const list = await this.listSessions(userId, workspaceId);
      if (list[0]) return this.getSessionWithMessages(userId, list[0].id);
      const created = await this.createSession(userId, workspaceId);
      return { ...created, messages: [] };
    },
    async getSessionWithMessages(userId, sessionId, afterSeq) {
      const session = sessions.get(sessionId);
      if (!session) throw new ChatNotFoundError("Sesión no encontrada");
      const ws = await workspaces.getForUser(userId, session.workspaceId);
      if (!ws) throw new ChatNotFoundError("Sesión no encontrada");
      const msgs = (messages.get(sessionId) ?? []).filter((m) =>
        afterSeq == null ? true : m.seq > afterSeq,
      );
      return { ...session, messages: msgs };
    },
    async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
      const session = sessions.get(input.chatSessionId);
      if (!session) throw new ChatNotFoundError("Sesión no encontrada");
      const ws = await workspaces.getForUser(input.userId, session.workspaceId);
      if (!ws) throw new ChatNotFoundError("Sesión no encontrada");

      const list = messages.get(input.chatSessionId) ?? [];
      if (input.clientMessageId) {
        const existing = list.find((m) => m.clientMessageId === input.clientMessageId);
        if (existing) {
          const assistant = list.find((m) => m.seq > existing.seq && m.role === "assistant");
          if (assistant) {
            return { session, userMessage: existing, assistantMessage: assistant, created: false };
          }
        }
      }

      const now = new Date().toISOString();
      const userSeq = (list.at(-1)?.seq ?? 0) + 1;
      const userMessage: ChatMessageDto = {
        id: crypto.randomUUID(),
        chatSessionId: input.chatSessionId,
        role: "user",
        mode: input.mode,
        provider: input.provider ?? session.provider,
        model: input.model ?? session.model,
        status: "done",
        error: null,
        parts: [{ type: "text", text: input.text }],
        usage: null,
        clientMessageId: input.clientMessageId ?? null,
        seq: userSeq,
        createdAt: now,
      };

      let status: "done" | "error" = "done";
      let text = input.text;
      let error: string | null = null;
      if (input.text.trim().toLowerCase() === "error") {
        status = "error";
        text = "";
        error = "No se pudo obtener la respuesta";
      }

      const assistantMessage: ChatMessageDto = {
        id: crypto.randomUUID(),
        chatSessionId: input.chatSessionId,
        role: "assistant",
        mode: input.mode,
        provider: userMessage.provider,
        model: userMessage.model,
        status,
        error,
        parts: text ? [{ type: "text", text }] : [],
        usage: null,
        clientMessageId: null,
        seq: userSeq + 1,
        createdAt: now,
      };

      list.push(userMessage, assistantMessage);
      messages.set(input.chatSessionId, list);
      const updated: ChatSessionDto = {
        ...session,
        mode: input.mode,
        provider: userMessage.provider!,
        model: userMessage.model!,
        lastMessageAt: now,
        updatedAt: now,
        title: session.title ?? input.text.slice(0, 80),
      };
      sessions.set(session.id, updated);
      return { session: updated, userMessage, assistantMessage, created: true };
    },
    async setCursorAgentId(_sessionId: string, _agentId: string): Promise<void> {
      // Memory mock does not track Cursor agent ids.
    },
  };
}
