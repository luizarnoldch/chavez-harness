import { defineRelations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "../auth/auth-schema.ts";

export const workspace = pgTable(
  "workspace",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    daemonDesired: text("daemon_desired").notNull().default("off"),
    daemonDesiredSource: text("daemon_desired_source"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("workspace_userId_path_uidx").on(table.userId, table.path),
    index("workspace_userId_idx").on(table.userId),
  ],
);

export const chatSession = pgTable(
  "chat_session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    title: text("title"),
    mode: text("mode").notNull().default("plan"),
    provider: text("provider").notNull().default("cursor"),
    model: text("model").notNull().default("auto"),
    /** Cursor SDK agent id for Agent.resume across turns (internal). */
    cursorAgentId: text("cursor_agent_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    lastMessageAt: timestamp("last_message_at"),
  },
  (table) => [
    index("chat_session_workspaceId_lastMessageAt_idx").on(
      table.workspaceId,
      table.lastMessageAt,
    ),
  ],
);

export const chatMessage = pgTable(
  "chat_message",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatSessionId: uuid("chat_session_id")
      .notNull()
      .references(() => chatSession.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    mode: text("mode"),
    provider: text("provider"),
    model: text("model"),
    status: text("status").notNull().default("done"),
    error: text("error"),
    parts: jsonb("parts").notNull().$type<unknown[]>(),
    clientMessageId: text("client_message_id"),
    seq: integer("seq").notNull(),
    usage: jsonb("usage").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("chat_message_session_seq_uidx").on(table.chatSessionId, table.seq),
    uniqueIndex("chat_message_session_clientMessageId_uidx").on(
      table.chatSessionId,
      table.clientMessageId,
    ),
    index("chat_message_chatSessionId_idx").on(table.chatSessionId),
  ],
);

export const chatRelations = defineRelations(
  { user, workspace, chatSession, chatMessage },
  (r) => ({
    user: {
      workspaces: r.many.workspace(),
    },
    workspace: {
      user: r.one.user({
        from: r.workspace.userId,
        to: r.user.id,
      }),
      chatSessions: r.many.chatSession(),
    },
    chatSession: {
      workspace: r.one.workspace({
        from: r.chatSession.workspaceId,
        to: r.workspace.id,
      }),
      messages: r.many.chatMessage(),
    },
    chatMessage: {
      chatSession: r.one.chatSession({
        from: r.chatMessage.chatSessionId,
        to: r.chatSession.id,
      }),
    },
  }),
);
