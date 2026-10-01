import type {
  ChatGenerateProgressPhase,
  ChatGenerateToolCall,
} from "@chavez-harness/shared";

/** In-flight generation for one session, built from `chat.generate.progress` pushes. */
export type GenerateStream = {
  sessionId: string;
  phase: ChatGenerateProgressPhase;
  draftText: string;
  draftTools: ChatGenerateToolCall[];
};

export type GenerateProgressData = {
  sessionId?: string;
  phase?: ChatGenerateProgressPhase;
  textDelta?: string;
  toolCall?: ChatGenerateToolCall;
};

/** Same merge as the CLI bridge: tool updates patch the row with the same id. */
export function upsertDraftTool(
  tools: ChatGenerateToolCall[],
  tool: ChatGenerateToolCall,
): ChatGenerateToolCall[] {
  const idx = tools.findIndex((t) => t.id === tool.id);
  if (idx >= 0) {
    const next = tools.slice();
    next[idx] = { ...next[idx], ...tool };
    return next;
  }
  return [...tools, tool];
}

/**
 * Fold one progress push into the stream. Pushes for other sessions are
 * ignored (the hub fans out per workspace); a new session id starts over.
 */
export function applyGenerateProgress(
  prev: GenerateStream | null,
  data: GenerateProgressData,
  sessionId: string,
): GenerateStream | null {
  if (!data.sessionId || !data.phase || data.sessionId !== sessionId) return prev;
  const base = prev?.sessionId === data.sessionId ? prev : null;
  const draftText =
    data.phase === "streaming" && data.textDelta
      ? `${base?.draftText ?? ""}${data.textDelta}`
      : (base?.draftText ?? "");
  const draftTools = data.toolCall
    ? upsertDraftTool(base?.draftTools ?? [], data.toolCall)
    : (base?.draftTools ?? []);
  return { sessionId: data.sessionId, phase: data.phase, draftText, draftTools };
}

export function phaseLabel(phase: ChatGenerateProgressPhase | null): string {
  if (phase === "reasoning") return "Razonando";
  if (phase === "streaming") return "Escribiendo";
  if (phase === "tool") return "Usando herramientas";
  return "Esperando respuesta";
}
