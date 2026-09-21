import { z } from "@hono/zod-openapi";

export const ErrorBodySchema = z
  .object({
    error: z.string(),
  })
  .openapi("ErrorBody");

export const ChatModeSchema = z.enum(["plan", "build"]).openapi("ChatMode");

export const DaemonDesiredSchema = z.enum(["on", "off"]).openapi("DaemonDesired");

export const DaemonDesiredSourceSchema = z
  .enum(["tui", "web"])
  .openapi("DaemonDesiredSource");

export const MachinePresenceSchema = z
  .enum(["online", "offline"])
  .openapi("MachinePresence");

export const ConnectableProviderSchema = z
  .enum(["cursor", "openai", "grok", "antropic"])
  .openapi("ConnectableProvider");

export const WorkspaceIdParam = z.string().uuid().openapi({
  param: { name: "workspaceId", in: "path" },
  example: "550e8400-e29b-41d4-a716-446655440000",
});

export const SessionIdParam = z.string().uuid().openapi({
  param: { name: "sessionId", in: "path" },
  example: "550e8400-e29b-41d4-a716-446655440001",
});

export const ProviderPathParam = ConnectableProviderSchema.openapi({
  param: { name: "provider", in: "path" },
  example: "cursor",
});

const messagePartSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("reasoning"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("tool-call"),
    id: z.string(),
    name: z.string(),
    args: z.record(z.string(), z.unknown()),
    result: z.string().optional(),
  }),
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
]);

export const ChatMessageUsageCostSchema = z
  .object({
    rawCostCents: z.number(),
    chargedCents: z.number(),
  })
  .openapi("ChatMessageUsageCost");

export const ChatMessageUsageSchema = z
  .object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    cacheReadTokens: z.number().int().nonnegative(),
    cacheWriteTokens: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
    reasoningTokens: z.number().int().nonnegative().optional(),
    durationMs: z.number().nonnegative().optional(),
    cost: ChatMessageUsageCostSchema.optional(),
    resolvedModel: z.string().min(1).optional(),
  })
  .openapi("ChatMessageUsage");

export const WorkspaceSchema = z
  .object({
    id: z.string().uuid(),
    path: z.string().min(1),
    userId: z.string().uuid(),
    daemonDesired: DaemonDesiredSchema,
    daemonDesiredSource: DaemonDesiredSourceSchema.nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    lastActiveAt: z.string(),
  })
  .openapi("Workspace");

export const WorkspaceListSchema = z
  .object({
    workspaces: z.array(WorkspaceSchema),
  })
  .openapi("WorkspaceList");

export const BindWorkspaceBodySchema = z
  .object({
    path: z.string().min(1).openapi({ example: "/home/user/project" }),
  })
  .openapi("BindWorkspaceBody");

export const WorkspaceConnectionSchema = z
  .object({
    connectionId: z.string(),
    clientKind: z.enum(["daemon", "client", "host"]).nullable(),
    role: z.enum(["primary", "standby"]).nullable().optional(),
  })
  .openapi("WorkspaceConnection");

export const WorkspaceConnectionsSchema = z
  .object({
    daemon: z.enum(["online", "offline"]),
    daemonDesired: DaemonDesiredSchema,
    daemonDesiredSource: DaemonDesiredSourceSchema.nullable(),
    machineStatus: MachinePresenceSchema,
    connections: z.array(WorkspaceConnectionSchema),
  })
  .openapi("WorkspaceConnections");

export const DaemonControlBodySchema = z
  .object({
    desired: DaemonDesiredSchema,
    source: DaemonDesiredSourceSchema.default("web").optional(),
  })
  .openapi("DaemonControlBody");

export const DaemonControlResponseSchema = z
  .object({
    workspace: WorkspaceSchema,
    daemonStatus: z.enum(["online", "offline", "stale"]),
    ignored: z.boolean(),
    machineStatus: MachinePresenceSchema,
  })
  .openapi("DaemonControlResponse");

export const MachineStatusSchema = z
  .object({
    status: MachinePresenceSchema,
    machineId: z.string().nullable(),
    hostname: z.string().nullable(),
  })
  .openapi("MachineStatus");

export const ChatSessionSchema = z
  .object({
    id: z.string().uuid(),
    workspaceId: z.string().uuid(),
    title: z.string().nullable(),
    mode: ChatModeSchema,
    provider: z.string().min(1),
    model: z.string().min(1),
    createdAt: z.string(),
    updatedAt: z.string(),
    lastMessageAt: z.string().nullable(),
  })
  .openapi("ChatSession");

export const SessionListSchema = z
  .object({
    sessions: z.array(ChatSessionSchema),
  })
  .openapi("SessionList");

export const CreateSessionBodySchema = z
  .object({
    title: z.string().optional(),
    mode: ChatModeSchema.optional(),
    provider: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
  })
  .openapi("CreateSessionBody");

export const ChatMessageSchema = z
  .object({
    id: z.string().uuid(),
    chatSessionId: z.string().uuid(),
    role: z.enum(["user", "assistant", "system"]),
    mode: ChatModeSchema.nullable(),
    provider: z.string().nullable(),
    model: z.string().nullable(),
    status: z.enum(["pending", "done", "error"]),
    error: z.string().nullable(),
    parts: z.array(messagePartSchema),
    usage: ChatMessageUsageSchema.nullable(),
    clientMessageId: z.string().nullable(),
    seq: z.number().int().nonnegative(),
    createdAt: z.string(),
  })
  .openapi("ChatMessage");

export const ChatSessionWithMessagesSchema = ChatSessionSchema.extend({
  messages: z.array(ChatMessageSchema),
}).openapi("ChatSessionWithMessages");

export const DeleteSessionResponseSchema = z
  .object({
    workspaceId: z.string().uuid(),
    chatSessionId: z.string().uuid(),
  })
  .openapi("DeleteSessionResponse");

export const SendMessageBodySchema = z
  .object({
    text: z.string().min(1),
    mode: ChatModeSchema,
    provider: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    clientMessageId: z.string().min(1).optional(),
  })
  .openapi("SendMessageBody");

export const SendMessageResponseSchema = z
  .object({
    session: ChatSessionSchema,
    userMessage: ChatMessageSchema,
    assistantMessage: ChatMessageSchema,
    created: z.boolean(),
  })
  .openapi("SendMessageResponse");

export const ProviderCredentialStatusSchema = z
  .object({
    provider: ConnectableProviderSchema,
    supported: z.boolean(),
    configured: z.boolean(),
    hint: z.string().nullable(),
  })
  .openapi("ProviderCredentialStatus");

export const ProviderCredentialsListSchema = z
  .object({
    providers: z.array(ProviderCredentialStatusSchema),
  })
  .openapi("ProviderCredentialsList");

export const UpsertProviderCredentialBodySchema = z
  .object({
    apiKey: z.string().min(1),
  })
  .openapi("UpsertProviderCredentialBody");

export const UnwrapProviderJobBodySchema = z
  .object({
    jobId: z.string().uuid(),
    unwrapToken: z.string().min(1),
  })
  .openapi("UnwrapProviderJobBody");

export const UnwrapProviderJobResponseSchema = z
  .object({
    provider: z.string().min(1),
    apiKey: z.string().min(1),
  })
  .openapi("UnwrapProviderJobResponse");
