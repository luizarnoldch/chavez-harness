import { z } from "zod";
import { messagePartsSchema } from "./message.schema.ts";

export const DEFAULT_CHAT_PROVIDER = "cursor" as const;
export const DEFAULT_CHAT_MODEL = "auto" as const;

export const chatModeSchema = z.enum(["plan", "build"]);
export type ChatMode = z.infer<typeof chatModeSchema>;

export const chatMessageRoleSchema = z.enum(["user", "assistant", "system"]);
export type ChatMessageRole = z.infer<typeof chatMessageRoleSchema>;

export const chatMessageStatusSchema = z.enum(["pending", "done", "error"]);
export type ChatMessageStatus = z.infer<typeof chatMessageStatusSchema>;

export const chatMessageUsageCostSchema = z.object({
  rawCostCents: z.number(),
  chargedCents: z.number(),
});
export type ChatMessageUsageCost = z.infer<typeof chatMessageUsageCostSchema>;

export const chatMessageUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  reasoningTokens: z.number().int().nonnegative().optional(),
  durationMs: z.number().nonnegative().optional(),
  cost: chatMessageUsageCostSchema.optional(),
  resolvedModel: z.string().min(1).optional(),
});
export type ChatMessageUsage = z.infer<typeof chatMessageUsageSchema>;

export const workspaceDtoSchema = z.object({
  id: z.string().uuid(),
  path: z.string().min(1),
  userId: z.string().uuid(),
  daemonDesired: z.enum(["on", "off"]),
  daemonDesiredSource: z.enum(["tui", "web"]).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastActiveAt: z.string(),
});
export type WorkspaceDto = z.infer<typeof workspaceDtoSchema>;

export const chatSessionDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  title: z.string().nullable(),
  mode: chatModeSchema,
  provider: z.string().min(1),
  model: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastMessageAt: z.string().nullable(),
});
export type ChatSessionDto = z.infer<typeof chatSessionDtoSchema>;

export const chatMessageDtoSchema = z.object({
  id: z.string().uuid(),
  chatSessionId: z.string().uuid(),
  role: chatMessageRoleSchema,
  mode: chatModeSchema.nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  status: chatMessageStatusSchema,
  error: z.string().nullable(),
  parts: messagePartsSchema,
  usage: chatMessageUsageSchema.nullable(),
  clientMessageId: z.string().nullable(),
  seq: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type ChatMessageDto = z.infer<typeof chatMessageDtoSchema>;

export const chatSessionWithMessagesDtoSchema = chatSessionDtoSchema.extend({
  messages: z.array(chatMessageDtoSchema),
});
export type ChatSessionWithMessagesDto = z.infer<typeof chatSessionWithMessagesDtoSchema>;
