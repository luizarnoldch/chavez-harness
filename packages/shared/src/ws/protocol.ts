import { z } from "zod";
import {
  chatMessageDtoSchema,
  chatMessageUsageSchema,
  chatModeSchema,
  chatSessionDtoSchema,
  chatSessionWithMessagesDtoSchema,
  workspaceDtoSchema,
} from "../schemas/chat.schema.ts";
import { messagePartsSchema } from "../schemas/message.schema.ts";
import { toolCallArgsSchema } from "../schemas/tools.schema.ts";

export const clientKindSchema = z.enum(["daemon", "client", "host"]);
export type ClientKind = z.infer<typeof clientKindSchema>;

/** Kinds allowed on `workspace.bind` (host uses `host.bind`). */
export const workspaceBindClientKindSchema = z.enum(["daemon", "client"]);
export type WorkspaceBindClientKind = z.infer<typeof workspaceBindClientKindSchema>;

export const daemonRoleSchema = z.enum(["primary", "standby"]);
export type DaemonRole = z.infer<typeof daemonRoleSchema>;

export const daemonDesiredSchema = z.enum(["on", "off"]);
export type DaemonDesired = z.infer<typeof daemonDesiredSchema>;

export const daemonDesiredSourceSchema = z.enum(["tui", "web"]);
export type DaemonDesiredSource = z.infer<typeof daemonDesiredSourceSchema>;

export const machineStatusSchema = z.enum(["online", "offline"]);
export type MachineStatus = z.infer<typeof machineStatusSchema>;

export const workspaceConnectionSchema = z.object({
  connectionId: z.string().min(1),
  clientKind: clientKindSchema.nullable(),
  role: daemonRoleSchema.nullable().optional(),
});
export type WorkspaceConnection = z.infer<typeof workspaceConnectionSchema>;

/** Client → server request (always has `id` for correlation). */
export const wsRequestBaseSchema = z.object({
  id: z.string().min(1),
});

/** Server → client reply for a request. */
export const wsReplySchema = z.object({
  type: z.string(),
  id: z.string().min(1),
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});
export type WsReply = z.infer<typeof wsReplySchema>;

/** Server → client or daemon push (no request id; distinguished by `push: true`). */
export const wsPushBaseSchema = z.object({
  push: z.literal(true),
  eventId: z.string().min(1),
});

export const workspaceBindRequestSchema = wsRequestBaseSchema.extend({
  type: z.literal("workspace.bind"),
  path: z.string().min(1),
  clientKind: workspaceBindClientKindSchema,
  daemonId: z.string().min(1).optional(),
});
export type WorkspaceBindRequest = z.infer<typeof workspaceBindRequestSchema>;

export const workspaceBindDataSchema = z.object({
  workspaceId: z.string().uuid(),
  path: z.string(),
  clientKind: workspaceBindClientKindSchema,
  role: daemonRoleSchema.optional(),
});
export type WorkspaceBindData = z.infer<typeof workspaceBindDataSchema>;

export const hostBindRequestSchema = wsRequestBaseSchema.extend({
  type: z.literal("host.bind"),
  machineId: z.string().min(1),
  hostname: z.string().min(1).optional(),
});
export type HostBindRequest = z.infer<typeof hostBindRequestSchema>;

export const hostBindDataSchema = z.object({
  machineId: z.string().min(1),
  hostname: z.string().nullable(),
  status: z.literal("online"),
});
export type HostBindData = z.infer<typeof hostBindDataSchema>;

export const machinePresencePushSchema = wsPushBaseSchema.extend({
  type: z.literal("machine.presence"),
  data: z.object({
    machineId: z.string().min(1),
    hostname: z.string().nullable().optional(),
    status: machineStatusSchema,
  }),
});
export type MachinePresencePush = z.infer<typeof machinePresencePushSchema>;

export const daemonStartDispatchSchema = wsPushBaseSchema.extend({
  type: z.literal("daemon.start.dispatch"),
  requestId: z.string().min(1),
  workspaceId: z.string().uuid(),
  path: z.string().min(1),
});
export type DaemonStartDispatch = z.infer<typeof daemonStartDispatchSchema>;

export const daemonStopDispatchSchema = wsPushBaseSchema.extend({
  type: z.literal("daemon.stop.dispatch"),
  requestId: z.string().min(1),
  workspaceId: z.string().uuid(),
  path: z.string().min(1),
});
export type DaemonStopDispatch = z.infer<typeof daemonStopDispatchSchema>;

export const daemonStartResultSchema = z.object({
  type: z.literal("daemon.start.result"),
  requestId: z.string().min(1),
  ok: z.boolean(),
  data: z
    .object({
      pid: z.number().int().positive().nullable(),
      spawned: z.boolean(),
    })
    .optional(),
  error: z.string().optional(),
});
export type DaemonStartResult = z.infer<typeof daemonStartResultSchema>;

export const daemonStopResultSchema = z.object({
  type: z.literal("daemon.stop.result"),
  requestId: z.string().min(1),
  ok: z.boolean(),
  data: z
    .object({
      stopped: z.boolean(),
    })
    .optional(),
  error: z.string().optional(),
});
export type DaemonStopResult = z.infer<typeof daemonStopResultSchema>;

export const workspaceDaemonSetRequestSchema = wsRequestBaseSchema.extend({
  type: z.literal("workspace.daemon.set"),
  workspaceId: z.string().uuid(),
  desired: daemonDesiredSchema,
  source: daemonDesiredSourceSchema,
});
export type WorkspaceDaemonSetRequest = z.infer<typeof workspaceDaemonSetRequestSchema>;

export const workspaceDaemonSetDataSchema = z.object({
  workspaceId: z.string().uuid(),
  daemonDesired: daemonDesiredSchema,
  daemonDesiredSource: daemonDesiredSourceSchema.nullable(),
  daemonStatus: z.enum(["online", "offline", "stale"]),
  ignored: z.boolean().optional(),
});
export type WorkspaceDaemonSetData = z.infer<typeof workspaceDaemonSetDataSchema>;

export const daemonHeartbeatRequestSchema = wsRequestBaseSchema.extend({
  type: z.literal("daemon.heartbeat"),
  workspaceId: z.string().uuid(),
});
export type DaemonHeartbeatRequest = z.infer<typeof daemonHeartbeatRequestSchema>;

export const daemonPresencePushSchema = wsPushBaseSchema.extend({
  type: z.literal("daemon.presence"),
  data: z.object({
    workspaceId: z.string().uuid(),
    status: z.enum(["online", "offline", "stale"]),
    connectionId: z.string().optional(),
    role: daemonRoleSchema.optional(),
  }),
});
export type DaemonPresencePush = z.infer<typeof daemonPresencePushSchema>;

export const workspacePingRequestSchema = wsRequestBaseSchema.extend({
  type: z.literal("workspace.ping"),
  workspaceId: z.string().uuid(),
});
export type WorkspacePingRequest = z.infer<typeof workspacePingRequestSchema>;

export const workspacePingDispatchSchema = wsPushBaseSchema.extend({
  type: z.literal("workspace.ping.dispatch"),
  requestId: z.string().min(1),
  workspaceId: z.string().uuid(),
  path: z.string().min(1),
});
export type WorkspacePingDispatch = z.infer<typeof workspacePingDispatchSchema>;

export const workspacePingResultSchema = z.object({
  type: z.literal("workspace.ping.result"),
  requestId: z.string().min(1),
  ok: z.boolean(),
  data: z
    .object({
      pong: z.literal(true),
      path: z.string(),
    })
    .optional(),
  error: z.string().optional(),
});
export type WorkspacePingResult = z.infer<typeof workspacePingResultSchema>;

export const workspacePingDataSchema = z.object({
  pong: z.literal(true),
  path: z.string(),
});

export const workspaceSyncRequestSchema = wsRequestBaseSchema.extend({
  type: z.literal("workspace.sync"),
  workspaceId: z.string().uuid(),
  chatSessionId: z.string().uuid().optional(),
});
export type WorkspaceSyncRequest = z.infer<typeof workspaceSyncRequestSchema>;

export const workspaceSyncDataSchema = z.object({
  workspace: workspaceDtoSchema,
  daemonStatus: z.enum(["online", "offline", "stale"]),
  machineStatus: machineStatusSchema.optional(),
  chatSessionId: z.string().uuid().nullable(),
  connections: z.array(workspaceConnectionSchema).optional(),
});
export type WorkspaceSyncData = z.infer<typeof workspaceSyncDataSchema>;

export const sessionListRequestSchema = wsRequestBaseSchema.extend({
  type: z.literal("session.list"),
  workspaceId: z.string().uuid(),
});
export type SessionListRequest = z.infer<typeof sessionListRequestSchema>;

export const sessionOpenRequestSchema = wsRequestBaseSchema.extend({
  type: z.literal("session.open"),
  workspaceId: z.string().uuid(),
  chatSessionId: z.string().uuid().optional(),
  afterSeq: z.number().int().nonnegative().optional(),
});
export type SessionOpenRequest = z.infer<typeof sessionOpenRequestSchema>;

export const sessionCreateRequestSchema = wsRequestBaseSchema.extend({
  type: z.literal("session.create"),
  workspaceId: z.string().uuid(),
  title: z.string().optional(),
  mode: chatModeSchema.optional(),
  provider: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
});
export type SessionCreateRequest = z.infer<typeof sessionCreateRequestSchema>;

export const sessionDeleteRequestSchema = wsRequestBaseSchema.extend({
  type: z.literal("session.delete"),
  chatSessionId: z.string().uuid(),
});
export type SessionDeleteRequest = z.infer<typeof sessionDeleteRequestSchema>;

export const sessionDeletedPushSchema = wsPushBaseSchema.extend({
  type: z.literal("session.deleted"),
  data: z.object({
    workspaceId: z.string().uuid(),
    chatSessionId: z.string().uuid(),
  }),
});
export type SessionDeletedPush = z.infer<typeof sessionDeletedPushSchema>;

export const chatSendRequestSchema = wsRequestBaseSchema.extend({
  type: z.literal("chat.send"),
  chatSessionId: z.string().uuid(),
  text: z.string().min(1),
  mode: chatModeSchema,
  provider: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  clientMessageId: z.string().min(1).optional(),
});
export type ChatSendRequest = z.infer<typeof chatSendRequestSchema>;

export const sessionUpdatedPushSchema = wsPushBaseSchema.extend({
  type: z.literal("session.updated"),
  data: chatSessionDtoSchema,
});
export type SessionUpdatedPush = z.infer<typeof sessionUpdatedPushSchema>;

export const sessionMessageCreatedPushSchema = wsPushBaseSchema.extend({
  type: z.literal("session.message.created"),
  data: z.object({
    workspaceId: z.string().uuid(),
    session: chatSessionDtoSchema,
    message: chatMessageDtoSchema,
  }),
});
export type SessionMessageCreatedPush = z.infer<typeof sessionMessageCreatedPushSchema>;

export const connectionStatusPushSchema = wsPushBaseSchema.extend({
  type: z.literal("connection.status"),
  data: z.object({
    linked: z.boolean(),
    workspaceId: z.string().uuid(),
    path: z.string(),
    daemon: z.enum(["online", "offline", "stale"]),
    connections: z.array(workspaceConnectionSchema),
  }),
});
export type ConnectionStatusPush = z.infer<typeof connectionStatusPushSchema>;

export const chatSendDataSchema = z.object({
  session: chatSessionDtoSchema,
  userMessage: chatMessageDtoSchema,
  assistantMessage: chatMessageDtoSchema,
  created: z.boolean(),
});

export const chatGenerateDispatchSchema = wsPushBaseSchema.extend({
  type: z.literal("chat.generate.dispatch"),
  requestId: z.string().min(1),
  workspaceId: z.string().uuid(),
  sessionId: z.string().uuid(),
  messageId: z.string().uuid(),
  model: z.string().min(1),
  prompt: z.string().min(1),
  mode: chatModeSchema,
  path: z.string().min(1),
  jobId: z.string().uuid(),
  unwrapToken: z.string().min(1),
  /** Existing Cursor SDK agent id for Agent.resume; omitted on first turn. */
  agentId: z.string().min(1).optional(),
});
export type ChatGenerateDispatch = z.infer<typeof chatGenerateDispatchSchema>;

export const chatGenerateResultSchema = z.object({
  type: z.literal("chat.generate.result"),
  requestId: z.string().min(1),
  ok: z.boolean(),
  data: z
    .object({
      text: z.string(),
      agentId: z.string().min(1),
      usage: chatMessageUsageSchema.optional(),
      /** Ordered assistant parts (tool-call + text). Optional for older daemons. */
      parts: messagePartsSchema.optional(),
    })
    .optional(),
  error: z.string().optional(),
});
export type ChatGenerateResult = z.infer<typeof chatGenerateResultSchema>;

export const chatGenerateProgressPhaseSchema = z.enum([
  "reasoning",
  "streaming",
  "tool",
]);
export type ChatGenerateProgressPhase = z.infer<
  typeof chatGenerateProgressPhaseSchema
>;

export const chatGenerateToolCallStatusSchema = z.enum([
  "running",
  "completed",
  "error",
]);
export type ChatGenerateToolCallStatus = z.infer<
  typeof chatGenerateToolCallStatusSchema
>;

/** Live tool-call payload on generate progress (mirrors SDK tool_call). */
export const chatGenerateToolCallSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: chatGenerateToolCallStatusSchema,
  args: toolCallArgsSchema.optional(),
  result: z.string().optional(),
});
export type ChatGenerateToolCall = z.infer<typeof chatGenerateToolCallSchema>;

/** Daemon → server (then rebroadcast to TUI clients). Does not settle pending. */
export const chatGenerateProgressSchema = z.object({
  type: z.literal("chat.generate.progress"),
  requestId: z.string().min(1),
  workspaceId: z.string().uuid(),
  sessionId: z.string().uuid(),
  phase: chatGenerateProgressPhaseSchema,
  textDelta: z.string().optional(),
  toolCall: chatGenerateToolCallSchema.optional(),
});
export type ChatGenerateProgress = z.infer<typeof chatGenerateProgressSchema>;

/** Server → TUI clients while generate is in flight. */
export const chatGenerateProgressPushSchema = wsPushBaseSchema.extend({
  type: z.literal("chat.generate.progress"),
  data: z.object({
    requestId: z.string().min(1),
    workspaceId: z.string().uuid(),
    sessionId: z.string().uuid(),
    phase: chatGenerateProgressPhaseSchema,
    textDelta: z.string().optional(),
    toolCall: chatGenerateToolCallSchema.optional(),
  }),
});
export type ChatGenerateProgressPush = z.infer<
  typeof chatGenerateProgressPushSchema
>;

export const sessionOpenDataSchema = chatSessionWithMessagesDtoSchema;
export const sessionListDataSchema = z.object({
  sessions: z.array(chatSessionDtoSchema),
});

export const incomingWsMessageSchema = z.discriminatedUnion("type", [
  workspaceBindRequestSchema,
  hostBindRequestSchema,
  daemonHeartbeatRequestSchema,
  workspacePingRequestSchema,
  workspacePingResultSchema,
  daemonStartResultSchema,
  daemonStopResultSchema,
  workspaceDaemonSetRequestSchema,
  workspaceSyncRequestSchema,
  sessionListRequestSchema,
  sessionOpenRequestSchema,
  sessionCreateRequestSchema,
  sessionDeleteRequestSchema,
  chatSendRequestSchema,
  chatGenerateResultSchema,
  chatGenerateProgressSchema,
]);
export type IncomingWsMessage = z.infer<typeof incomingWsMessageSchema>;

export const NO_DAEMON_ERROR =
  "No daemon bound for this workspace. Activa el daemon desde la web o abre el TUI.";

export const NO_HOST_ERROR =
  "PC offline: el Host no está conectado. Arranca el Host en tu máquina.";

/** Daemon chat generate wait (Cursor CLI install + generate). */
export const CHAT_GENERATE_TIMEOUT_MS = 180_000;
