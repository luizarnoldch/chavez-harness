import { Agent, CursorAgentError, type SDKAgent, type SDKMessage, type ToolName } from "@cursor/sdk";
import {
  cursorToolsForChatMode,
  type ChatGenerateToolCall,
  type ChatMessageDto,
  type ChatMessageUsage,
  type ChatMode,
} from "@chavez-harness/shared";
import { apiFetch } from "../../auth/api/api.ts";
import type { Credentials } from "../../auth/api/credentials.ts";

const DEFAULT_CURSOR_MODEL = "auto";
export const TOOL_PAYLOAD_MAX = 4096;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

export type CursorGenerateProgressPhase = "reasoning" | "streaming" | "tool";

export type CursorGenerateProgress = {
  phase: CursorGenerateProgressPhase;
  textDelta?: string;
  toolCall?: ChatGenerateToolCall;
};

export type CursorGenerateInput = {
  credentials: Credentials;
  jobId: string;
  unwrapToken: string;
  model: string;
  prompt: string;
  workspacePath: string;
  mode?: ChatMode;
  /** Existing Cursor SDK agent id for Agent.resume. */
  agentId?: string | null;
  onProgress?: (progress: CursorGenerateProgress) => void;
};

export type MessagePart = ChatMessageDto["parts"][number];

export type CursorGenerateResult = {
  text: string;
  agentId: string;
  usage?: ChatMessageUsage;
  parts?: MessagePart[];
};

type AgentCreateOptions = {
  apiKey: string;
  model: { id: string };
  local: { cwd: string };
  tools?: ToolName[];
};

export type CursorAgentFactory = {
  create: (options: AgentCreateOptions) => Promise<SDKAgent>;
  resume: (
    agentId: string,
    options: AgentCreateOptions & { local?: { cwd: string } },
  ) => Promise<SDKAgent>;
};

const defaultAgentFactory: CursorAgentFactory = {
  create: (options) => Agent.create(options),
  resume: (agentId, options) => Agent.resume(agentId, options),
};

export function resolveCursorModelId(model: string): string {
  const trimmed = model.trim();
  if (!trimmed || trimmed === "eco" || trimmed === "local") {
    return DEFAULT_CURSOR_MODEL;
  }
  return trimmed;
}

/**
 * Plan: read-only SDK tools. Build (or unset): omit tools so the full default
 * toolset applies (must re-pass on every create/resume — SDK does not persist).
 */
export function toolsForChatMode(mode: ChatMode | undefined): ToolName[] | undefined {
  const tools = cursorToolsForChatMode(mode);
  return tools ? [...tools] : undefined;
}

export function truncateUtf8(value: string, max = TOOL_PAYLOAD_MAX): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

/** Coerce SDK tool args into a JSON-safe record for the wire protocol. */
export function normalizeToolArgs(args: unknown): JsonRecord | undefined {
  if (args == null) return undefined;
  try {
    const json = JSON.stringify(args);
    const parsed = JSON.parse(json) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      if (json.length <= TOOL_PAYLOAD_MAX) {
        return parsed as JsonRecord;
      }
      return { _truncated: true, preview: truncateUtf8(json) };
    }
    return { value: truncateUtf8(json) };
  } catch {
    return { value: truncateUtf8(String(args)) };
  }
}

export function stringifyToolResult(result: unknown): string | undefined {
  if (result == null) return undefined;
  if (typeof result === "string") return truncateUtf8(result);
  try {
    return truncateUtf8(JSON.stringify(result));
  } catch {
    return truncateUtf8(String(result));
  }
}

export function upsertToolCallPart(
  parts: MessagePart[],
  tool: ChatGenerateToolCall,
): MessagePart[] {
  const next: MessagePart = {
    type: "tool-call",
    id: tool.id,
    name: tool.name,
    args: tool.args ?? {},
    ...(tool.result != null ? { result: tool.result } : {}),
  };
  const idx = parts.findIndex(
    (p) => p.type === "tool-call" && p.id === tool.id,
  );
  if (idx >= 0) {
    const copy = parts.slice();
    copy[idx] = next;
    return copy;
  }
  return [...parts, next];
}

export function appendTextPart(parts: MessagePart[], text: string): MessagePart[] {
  if (!text) return parts;
  const last = parts[parts.length - 1];
  if (last?.type === "text") {
    return [...parts.slice(0, -1), { type: "text", text: last.text + text }];
  }
  return [...parts, { type: "text", text }];
}

/** Map SDK run result to assistant text (testable without live Agent). */
export function textFromRunResult(result: {
  status: string;
  result?: string;
  error?: { message?: string };
}): string {
  if (result.status === "error") {
    throw new Error(result.error?.message ?? `Cursor run failed (${result.status})`);
  }
  if (result.status === "cancelled") {
    throw new Error("Cursor run cancelled");
  }
  const text = result.result?.trim();
  if (!text) {
    throw new Error("Cursor SDK returned empty text");
  }
  return text;
}

/** Build persisted usage from a run wait() result (+ optional cost). */
export function usageFromRunResult(
  result: {
    usage?: {
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      cacheWriteTokens: number;
      totalTokens: number;
      reasoningTokens?: number;
    };
    durationMs?: number;
    model?: { id: string };
  },
  cost?: { rawCostCents: number; chargedCents: number },
): ChatMessageUsage | undefined {
  const tokens = result.usage;
  if (!tokens && result.durationMs == null && !result.model?.id && !cost) {
    return undefined;
  }
  return {
    inputTokens: tokens?.inputTokens ?? 0,
    outputTokens: tokens?.outputTokens ?? 0,
    cacheReadTokens: tokens?.cacheReadTokens ?? 0,
    cacheWriteTokens: tokens?.cacheWriteTokens ?? 0,
    totalTokens: tokens?.totalTokens ?? 0,
    ...(tokens?.reasoningTokens != null
      ? { reasoningTokens: tokens.reasoningTokens }
      : {}),
    ...(result.durationMs != null ? { durationMs: result.durationMs } : {}),
    ...(cost ? { cost } : {}),
    ...(result.model?.id ? { resolvedModel: result.model.id } : {}),
  };
}

/** Map an SDK stream event into one or more progress updates for the TUI. */
export function progressEventsFromSdkMessage(
  event: SDKMessage,
): CursorGenerateProgress[] {
  if (event.type === "thinking") {
    return [{ phase: "reasoning" }];
  }
  if (event.type === "tool_call") {
    const args = normalizeToolArgs(event.args);
    const result = stringifyToolResult(event.result);
    return [
      {
        phase: "tool",
        toolCall: {
          id: event.call_id,
          name: event.name,
          status: event.status,
          ...(args ? { args } : {}),
          ...(result != null ? { result } : {}),
        },
      },
    ];
  }
  if (event.type === "assistant") {
    const out: CursorGenerateProgress[] = [];
    for (const block of event.message.content) {
      if (block.type === "tool_use") {
        const args = normalizeToolArgs(block.input);
        out.push({
          phase: "tool",
          toolCall: {
            id: block.id,
            name: block.name,
            status: "running",
            ...(args ? { args } : {}),
          },
        });
      }
    }
    const text = event.message.content
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("");
    if (text) {
      out.push({ phase: "streaming", textDelta: text });
    } else if (out.length === 0) {
      out.push({ phase: "streaming" });
    }
    return out;
  }
  return [];
}

/** @deprecated Prefer progressEventsFromSdkMessage when a single event may yield multiple updates. */
export function progressFromSdkMessage(
  event: SDKMessage,
): CursorGenerateProgress | null {
  return progressEventsFromSdkMessage(event)[0] ?? null;
}

async function unwrapApiKey(
  credentials: Credentials,
  jobId: string,
  unwrapToken: string,
): Promise<string> {
  const response = await apiFetch(
    "/api/provider-jobs/unwrap",
    {
      method: "POST",
      body: JSON.stringify({ jobId, unwrapToken }),
    },
    credentials,
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Unwrap failed (${response.status})`);
  }
  const data = (await response.json()) as { apiKey: string };
  if (!data.apiKey) {
    throw new Error("Unwrap response missing apiKey");
  }
  return data.apiKey;
}

async function openAgent(
  factory: CursorAgentFactory,
  apiKey: string,
  modelId: string,
  workspacePath: string,
  agentId: string | null | undefined,
  tools: ToolName[] | undefined,
): Promise<SDKAgent> {
  const base = {
    apiKey,
    model: { id: modelId },
    local: { cwd: workspacePath },
    ...(tools !== undefined ? { tools } : {}),
  } satisfies AgentCreateOptions;

  if (agentId) {
    try {
      return await factory.resume(agentId, base);
    } catch {
      // Invalid/expired agent — fall back to a fresh create.
    }
  }
  return factory.create(base);
}

async function tryLoadCost(
  agent: SDKAgent,
  runId: string,
): Promise<{ rawCostCents: number; chargedCents: number } | undefined> {
  try {
    const agentUsage = await agent.getUsage({ runId });
    if (agentUsage.cost) {
      return agentUsage.cost;
    }
    const match = agentUsage.runs.find((r) => r.runId === runId);
    return match?.cost;
  } catch {
    return undefined;
  }
}

/**
 * Runs Cursor via `@cursor/sdk` on the daemon host against the workspace cwd.
 * Streams progress events; resumes an existing agent when `agentId` is provided.
 */
export async function runCursorSdkGenerate(
  input: CursorGenerateInput,
  agentFactory: CursorAgentFactory = defaultAgentFactory,
): Promise<CursorGenerateResult> {
  const apiKey = await unwrapApiKey(
    input.credentials,
    input.jobId,
    input.unwrapToken,
  );
  const modelId = resolveCursorModelId(input.model);
  const tools = toolsForChatMode(input.mode);

  try {
    await using agent = await openAgent(
      agentFactory,
      apiKey,
      modelId,
      input.workspacePath,
      input.agentId,
      tools,
    );

    const run = await agent.send(input.prompt, { model: { id: modelId } });

    let streamedText = "";
    let parts: MessagePart[] = [];
    if (run.supports("stream")) {
      for await (const event of run.stream()) {
        const progresses = progressEventsFromSdkMessage(event);
        for (const progress of progresses) {
          if (progress.toolCall) {
            parts = upsertToolCallPart(parts, progress.toolCall);
            input.onProgress?.(progress);
            continue;
          }
          if (progress.textDelta) {
            let delta = progress.textDelta;
            if (delta.startsWith(streamedText)) {
              delta = delta.slice(streamedText.length);
              streamedText = progress.textDelta;
            } else {
              streamedText += delta;
            }
            if (delta) {
              parts = appendTextPart(parts, delta);
              input.onProgress?.({ phase: "streaming", textDelta: delta });
            }
            continue;
          }
          input.onProgress?.(progress);
        }
      }
    }

    const result = await run.wait();
    const cost = await tryLoadCost(agent, result.id);
    const usage = usageFromRunResult(result, cost);

    let text: string;
    try {
      text = textFromRunResult(result);
    } catch {
      text = streamedText.trim();
      if (!text) throw new Error("Cursor SDK returned empty text");
    }

    // Ensure final text part matches wait() text when stream was partial/empty.
    const hasTextPart = parts.some((p) => p.type === "text");
    if (!hasTextPart && text) {
      parts = appendTextPart(parts, text);
    } else if (hasTextPart && text && streamedText.trim() !== text) {
      parts = [
        ...parts.filter((p) => p.type !== "text"),
        { type: "text", text },
      ];
    }

    return {
      text,
      agentId: agent.agentId,
      ...(usage ? { usage } : {}),
      ...(parts.length > 0 ? { parts } : {}),
    };
  } catch (err) {
    if (err instanceof CursorAgentError) {
      throw new Error(
        `Cursor SDK startup failed: ${err.message}${err.isRetryable ? " (retryable)" : ""}`,
      );
    }
    throw err;
  }
}
