import type { ChatMode } from "../schemas/chat.schema.ts";

/**
 * Public Cursor SDK tool names allowed in Plan mode (read / research only).
 * Build mode omits `tools` so the SDK default toolset applies in full.
 */
export const CURSOR_PLAN_TOOLS = [
  "read",
  "grep",
  "glob",
  "ls",
  "semSearch",
  "readLints",
  "readTodos",
  "webSearch",
  "webFetch",
  "askQuestion",
  "await",
] as const;

export type CursorPlanTool = (typeof CURSOR_PLAN_TOOLS)[number];

/** Tools offered to the Cursor agent for a chat mode. `undefined` = full SDK default. */
export function cursorToolsForChatMode(
  mode: ChatMode | undefined,
): readonly CursorPlanTool[] | undefined {
  return mode === "plan" ? CURSOR_PLAN_TOOLS : undefined;
}
