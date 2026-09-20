import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_CHAT_PROVIDER,
  type ChatMessageDto,
  type ChatMessageUsage,
  type ChatMode,
  type ChatSessionDto,
  type ChatSessionWithMessagesDto,
  type WorkspaceDto,
} from "@chavez-harness/shared";
import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { chatMessage, chatSession, workspace } from "../db/chat/schema.ts";
import type { Db } from "../lib/db.ts";

export const REPLY_ERROR_TEXT = "No se pudo obtener la respuesta";

function toIso(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString();
}

function mapWorkspace(row: typeof workspace.$inferSelect): WorkspaceDto {
  return {
    id: row.id,
    path: row.path,
    userId: row.userId,
    daemonDesired: (row.daemonDesired === "on" ? "on" : "off") as WorkspaceDto["daemonDesired"],
    daemonDesiredSource:
      row.daemonDesiredSource === "tui" || row.daemonDesiredSource === "web"
        ? row.daemonDesiredSource
        : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastActiveAt: row.lastActiveAt.toISOString(),
  };
}

function mapSession(row: typeof chatSession.$inferSelect): ChatSessionDto {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    mode: row.mode as ChatMode,
    provider: row.provider,
    model: row.model,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastMessageAt: toIso(row.lastMessageAt),
  };
}

function mapMessage(row: typeof chatMessage.$inferSelect): ChatMessageDto {
  return {
    id: row.id,
    chatSessionId: row.chatSessionId,
    role: row.role as ChatMessageDto["role"],
    mode: (row.mode as ChatMode | null) ?? null,
    provider: row.provider,
    model: row.model,
    status: row.status as ChatMessageDto["status"],
    error: row.error,
    parts: row.parts as ChatMessageDto["parts"],
    usage: (row.usage as ChatMessageUsage | null) ?? null,
    clientMessageId: row.clientMessageId,
    seq: row.seq,
    createdAt: row.createdAt.toISOString(),
  };
}

function isReplyError(text: string): boolean {
  return text.trim().toLowerCase() === "error";
}

export function resolveMockReply(text: string): string {
  if (isReplyError(text)) {
    throw new Error(REPLY_ERROR_TEXT);
  }
  return text;
}

export type WorkspaceService = ReturnType<typeof createWorkspaceService>;
export type ChatService = ReturnType<typeof createChatService>;

export function createWorkspaceService(db: Db) {
  return {
    async upsertByPath(userId: string, path: string): Promise<WorkspaceDto> {
      const now = new Date();
      const [row] = await db
        .insert(workspace)
        .values({
          userId,
          path,
          lastActiveAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [workspace.userId, workspace.path],
          set: {
            lastActiveAt: now,
            updatedAt: now,
          },
        })
        .returning();

      if (!row) {
        throw new Error("Failed to upsert workspace");
      }
      return mapWorkspace(row);
    },

    async getForUser(userId: string, workspaceId: string): Promise<WorkspaceDto | null> {
      const [row] = await db
        .select()
        .from(workspace)
        .where(and(eq(workspace.id, workspaceId), eq(workspace.userId, userId)))
        .limit(1);
      return row ? mapWorkspace(row) : null;
    },

    async listForUser(userId: string): Promise<WorkspaceDto[]> {
      const rows = await db
        .select()
        .from(workspace)
        .where(eq(workspace.userId, userId))
        .orderBy(desc(workspace.lastActiveAt));
      return rows.map(mapWorkspace);
    },

    async touch(workspaceId: string): Promise<void> {
      const now = new Date();
      await db
        .update(workspace)
        .set({ lastActiveAt: now, updatedAt: now })
        .where(eq(workspace.id, workspaceId));
    },

    async setDaemonDesired(
      userId: string,
      workspaceId: string,
      desired: WorkspaceDto["daemonDesired"],
      source: NonNullable<WorkspaceDto["daemonDesiredSource"]>,
    ): Promise<{ workspace: WorkspaceDto; ignored: boolean }> {
      const existing = await this.getForUser(userId, workspaceId);
      if (!existing) {
        throw new Error("Workspace no encontrado");
      }

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

      const now = new Date();
      const [row] = await db
        .update(workspace)
        .set({
          daemonDesired: desired,
          daemonDesiredSource: sourceToStore,
          updatedAt: now,
          lastActiveAt: now,
        })
        .where(and(eq(workspace.id, workspaceId), eq(workspace.userId, userId)))
        .returning();

      if (!row) {
        throw new Error("Workspace no encontrado");
      }
      return { workspace: mapWorkspace(row), ignored: false };
    },
  };
}

export type SendMessageInput = {
  chatSessionId: string;
  userId: string;
  text: string;
  mode: ChatMode;
  provider?: string;
  model?: string;
  clientMessageId?: string;
  /** Used for non-local providers (e.g. Cursor via daemon). */
  generateReply?: (ctx: {
    provider: string;
    model: string;
    text: string;
    workspaceId: string;
    workspacePath: string;
    cursorAgentId: string | null;
  }) => Promise<{ text: string; usage?: ChatMessageUsage | null }>;
};

export type SendMessageResult = {
  session: ChatSessionDto;
  userMessage: ChatMessageDto;
  assistantMessage: ChatMessageDto;
  created: boolean;
};

export function createChatService(db: Db) {
  const workspaces = createWorkspaceService(db);

  async function assertSessionOwned(
    userId: string,
    sessionId: string,
  ): Promise<{ session: typeof chatSession.$inferSelect; workspace: WorkspaceDto }> {
    const [row] = await db
      .select({
        session: chatSession,
        workspace: workspace,
      })
      .from(chatSession)
      .innerJoin(workspace, eq(chatSession.workspaceId, workspace.id))
      .where(and(eq(chatSession.id, sessionId), eq(workspace.userId, userId)))
      .limit(1);

    if (!row) {
      throw new ChatNotFoundError("Sesión no encontrada");
    }
    return { session: row.session, workspace: mapWorkspace(row.workspace) };
  }

  async function nextSeq(chatSessionId: string): Promise<number> {
    const [row] = await db
      .select({ maxSeq: sql<number>`coalesce(max(${chatMessage.seq}), 0)` })
      .from(chatMessage)
      .where(eq(chatMessage.chatSessionId, chatSessionId));
    return Number(row?.maxSeq ?? 0) + 1;
  }

  return {
    async createSession(
      userId: string,
      workspaceId: string,
      input: {
        title?: string | null;
        mode?: ChatMode;
        provider?: string;
        model?: string;
      } = {},
    ): Promise<ChatSessionDto> {
      const ws = await workspaces.getForUser(userId, workspaceId);
      if (!ws) {
        throw new ChatNotFoundError("Workspace no encontrado");
      }

      const [row] = await db
        .insert(chatSession)
        .values({
          workspaceId,
          title: input.title ?? null,
          mode: input.mode ?? "plan",
          provider: input.provider ?? DEFAULT_CHAT_PROVIDER,
          model: input.model ?? DEFAULT_CHAT_MODEL,
        })
        .returning();

      if (!row) {
        throw new Error("Failed to create chat session");
      }
      await workspaces.touch(workspaceId);
      return mapSession(row);
    },

    async listSessions(userId: string, workspaceId: string): Promise<ChatSessionDto[]> {
      const ws = await workspaces.getForUser(userId, workspaceId);
      if (!ws) {
        throw new ChatNotFoundError("Workspace no encontrado");
      }

      const rows = await db
        .select()
        .from(chatSession)
        .where(eq(chatSession.workspaceId, workspaceId))
        .orderBy(desc(chatSession.lastMessageAt), desc(chatSession.createdAt));
      return rows.map(mapSession);
    },

    async getLatestOrCreate(
      userId: string,
      workspaceId: string,
    ): Promise<ChatSessionWithMessagesDto> {
      const sessions = await this.listSessions(userId, workspaceId);
      if (sessions[0]) {
        return this.getSessionWithMessages(userId, sessions[0].id);
      }
      const created = await this.createSession(userId, workspaceId);
      return { ...created, messages: [] };
    },

    async getSessionWithMessages(
      userId: string,
      sessionId: string,
      afterSeq?: number,
    ): Promise<ChatSessionWithMessagesDto> {
      const { session } = await assertSessionOwned(userId, sessionId);
      const conditions = [eq(chatMessage.chatSessionId, sessionId)];
      if (afterSeq != null) {
        conditions.push(gt(chatMessage.seq, afterSeq));
      }
      const messages = await db
        .select()
        .from(chatMessage)
        .where(and(...conditions))
        .orderBy(asc(chatMessage.seq));

      return {
        ...mapSession(session),
        messages: messages.map(mapMessage),
      };
    },

    async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
      const { session, workspace: ws } = await assertSessionOwned(
        input.userId,
        input.chatSessionId,
      );

      const provider = input.provider ?? session.provider ?? DEFAULT_CHAT_PROVIDER;
      const model = input.model ?? session.model ?? DEFAULT_CHAT_MODEL;

      if (input.clientMessageId) {
        const [existingUser] = await db
          .select()
          .from(chatMessage)
          .where(
            and(
              eq(chatMessage.chatSessionId, input.chatSessionId),
              eq(chatMessage.clientMessageId, input.clientMessageId),
            ),
          )
          .limit(1);

        if (existingUser) {
          const [assistant] = await db
            .select()
            .from(chatMessage)
            .where(
              and(
                eq(chatMessage.chatSessionId, input.chatSessionId),
                gt(chatMessage.seq, existingUser.seq),
                eq(chatMessage.role, "assistant"),
              ),
            )
            .orderBy(asc(chatMessage.seq))
            .limit(1);

          if (assistant) {
            return {
              session: mapSession(session),
              userMessage: mapMessage(existingUser),
              assistantMessage: mapMessage(assistant),
              created: false,
            };
          }
        }
      }

      const userSeq = await nextSeq(input.chatSessionId);
      const [userRow] = await db
        .insert(chatMessage)
        .values({
          chatSessionId: input.chatSessionId,
          role: "user",
          mode: input.mode,
          provider,
          model,
          status: "done",
          parts: [{ type: "text", text: input.text }],
          clientMessageId: input.clientMessageId ?? null,
          seq: userSeq,
        })
        .returning();

      if (!userRow) {
        throw new Error("Failed to insert user message");
      }

      let assistantStatus: "done" | "error" = "done";
      let assistantText = "";
      let assistantError: string | null = null;
      let assistantUsage: ChatMessageUsage | null = null;
      try {
        if (provider === "local" || !input.generateReply) {
          if (provider !== "local" && !input.generateReply) {
            throw new Error(
              `Provider ${provider} requiere daemon. Usa /connect y asegúrate de que el daemon esté online.`,
            );
          }
          assistantText = resolveMockReply(input.text);
        } else {
          const reply = await input.generateReply({
            provider,
            model,
            text: input.text,
            workspaceId: ws.id,
            workspacePath: ws.path,
            cursorAgentId: session.cursorAgentId ?? null,
          });
          assistantText = reply.text;
          assistantUsage = reply.usage ?? null;
        }
      } catch (err) {
        assistantStatus = "error";
        assistantError = err instanceof Error ? err.message : REPLY_ERROR_TEXT;
      }

      const assistantSeq = userSeq + 1;
      const [assistantRow] = await db
        .insert(chatMessage)
        .values({
          chatSessionId: input.chatSessionId,
          role: "assistant",
          mode: input.mode,
          provider,
          model,
          status: assistantStatus,
          error: assistantError,
          parts: assistantText ? [{ type: "text", text: assistantText }] : [],
          usage: assistantUsage,
          seq: assistantSeq,
        })
        .returning();

      if (!assistantRow) {
        throw new Error("Failed to insert assistant message");
      }

      const now = new Date();
      const [updatedSession] = await db
        .update(chatSession)
        .set({
          mode: input.mode,
          provider,
          model,
          lastMessageAt: now,
          updatedAt: now,
          title: session.title ?? input.text.slice(0, 80),
        })
        .where(eq(chatSession.id, input.chatSessionId))
        .returning();

      await workspaces.touch(ws.id);

      return {
        session: mapSession(updatedSession ?? session),
        userMessage: mapMessage(userRow),
        assistantMessage: mapMessage(assistantRow),
        created: true,
      };
    },

    async setCursorAgentId(sessionId: string, agentId: string): Promise<void> {
      await db
        .update(chatSession)
        .set({ cursorAgentId: agentId, updatedAt: new Date() })
        .where(eq(chatSession.id, sessionId));
    },
  };
}

export class ChatNotFoundError extends Error {
  readonly status = 404;
  constructor(message: string) {
    super(message);
    this.name = "ChatNotFoundError";
  }
}
