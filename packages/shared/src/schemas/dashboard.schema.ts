import { z } from "zod";
import { chatSessionDtoSchema, workspaceDtoSchema } from "./chat.schema.ts";
import { machineStatusSchema, workspaceConnectionSchema } from "../ws/protocol.ts";

export const dashboardWorkspaceSchema = workspaceDtoSchema.extend({
  daemonStatus: z.enum(["online", "offline", "stale"]),
  connections: z.array(workspaceConnectionSchema),
  sessionCount: z.number().int().nonnegative(),
});
export type DashboardWorkspace = z.infer<typeof dashboardWorkspaceSchema>;

export const dashboardSessionSchema = chatSessionDtoSchema.extend({
  workspacePath: z.string().min(1),
});
export type DashboardSession = z.infer<typeof dashboardSessionSchema>;

/** `GET /api/dashboard`: cross-workspace snapshot the web store starts from. */
export const dashboardSnapshotSchema = z.object({
  machineStatus: machineStatusSchema,
  workspaces: z.array(dashboardWorkspaceSchema),
  /** Latest sessions across every workspace (max 10), most recent first. */
  recentSessions: z.array(dashboardSessionSchema),
  /** Sessions with activity since `since` (default: UTC midnight). */
  sessionsToday: z.number().int().nonnegative(),
  generatedAt: z.string(),
});
export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>;
