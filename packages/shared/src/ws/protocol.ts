import { z } from "zod";

export const clientKindSchema = z.enum(["daemon", "client"]);
export type ClientKind = z.infer<typeof clientKindSchema>;

export const daemonRoleSchema = z.enum(["primary", "standby"]);
export type DaemonRole = z.infer<typeof daemonRoleSchema>;

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
  clientKind: clientKindSchema,
  daemonId: z.string().min(1).optional(),
});
export type WorkspaceBindRequest = z.infer<typeof workspaceBindRequestSchema>;

export const workspaceBindDataSchema = z.object({
  workspaceId: z.string(),
  path: z.string(),
  clientKind: clientKindSchema,
  role: daemonRoleSchema.optional(),
});
export type WorkspaceBindData = z.infer<typeof workspaceBindDataSchema>;

export const daemonHeartbeatRequestSchema = wsRequestBaseSchema.extend({
  type: z.literal("daemon.heartbeat"),
  workspaceId: z.string().min(1),
});
export type DaemonHeartbeatRequest = z.infer<typeof daemonHeartbeatRequestSchema>;

export const daemonPresencePushSchema = wsPushBaseSchema.extend({
  type: z.literal("daemon.presence"),
  data: z.object({
    workspaceId: z.string(),
    status: z.enum(["online", "offline", "stale"]),
    connectionId: z.string().optional(),
    role: daemonRoleSchema.optional(),
  }),
});
export type DaemonPresencePush = z.infer<typeof daemonPresencePushSchema>;

export const workspacePingRequestSchema = wsRequestBaseSchema.extend({
  type: z.literal("workspace.ping"),
  workspaceId: z.string().min(1),
});
export type WorkspacePingRequest = z.infer<typeof workspacePingRequestSchema>;

export const workspacePingDispatchSchema = wsPushBaseSchema.extend({
  type: z.literal("workspace.ping.dispatch"),
  requestId: z.string().min(1),
  workspaceId: z.string().min(1),
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

export const incomingWsMessageSchema = z.discriminatedUnion("type", [
  workspaceBindRequestSchema,
  daemonHeartbeatRequestSchema,
  workspacePingRequestSchema,
  workspacePingResultSchema,
]);
export type IncomingWsMessage = z.infer<typeof incomingWsMessageSchema>;

export const NO_DAEMON_ERROR =
  "No daemon bound for this workspace. Run: chavez headless workspace open";
