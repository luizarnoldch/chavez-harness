import type { ChatMessageDto } from "@chavez-harness/shared";

type Part = ChatMessageDto["parts"][number];

export type RenderBlock =
  | { kind: "text"; key: string; text: string }
  | { kind: "reasoning"; key: string; text: string }
  | { kind: "tool"; key: string; part: Extract<Part, { type: "tool-call" }> };

export function textFromParts(parts: ChatMessageDto["parts"]): string {
  return parts
    .filter((p): p is Extract<Part, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();
}

/** Ordered blocks for an assistant message; consecutive text parts are joined. */
export function blocksFromParts(parts: ChatMessageDto["parts"]): RenderBlock[] {
  const blocks: RenderBlock[] = [];
  parts.forEach((part, idx) => {
    if (part.type === "text") {
      const last = blocks.at(-1);
      if (last?.kind === "text") {
        last.text = `${last.text}${part.text}`;
      } else if (part.text) {
        blocks.push({ kind: "text", key: `t${idx}`, text: part.text });
      }
    } else if (part.type === "reasoning") {
      if (part.text.trim()) blocks.push({ kind: "reasoning", key: `r${idx}`, text: part.text });
    } else {
      blocks.push({ kind: "tool", key: `c${part.id}-${idx}`, part });
    }
  });
  return blocks.filter((b) => b.kind !== "text" || b.text.trim().length > 0);
}

export function mergeMessages(
  current: ChatMessageDto[],
  incoming: ChatMessageDto[],
): ChatMessageDto[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const msg of incoming) {
    byId.set(msg.id, msg);
  }
  return [...byId.values()].sort((a, b) => a.seq - b.seq);
}

export function optimisticUserMessage(
  sessionId: string,
  text: string,
  mode: "plan" | "build",
  clientMessageId: string,
): ChatMessageDto {
  return {
    id: `optimistic-${clientMessageId}`,
    chatSessionId: sessionId,
    role: "user",
    mode,
    provider: null,
    model: null,
    status: "pending",
    error: null,
    parts: [{ type: "text", text }],
    usage: null,
    clientMessageId,
    seq: Number.MAX_SAFE_INTEGER - 1,
    createdAt: new Date().toISOString(),
  };
}
