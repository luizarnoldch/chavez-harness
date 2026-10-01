import type { ChatMessageUsage } from "@chavez-harness/shared";
import { Coins, Cpu, Timer } from "lucide-react";
import { formatCents, formatDuration, formatTokens } from "@/lib/format";

type UsageFooterProps = {
  usage: ChatMessageUsage;
  /** Model requested on the message; `resolvedModel` shows only when it differs. */
  model?: string | null;
};

/** Tokens in/out/cache, duration, cost and resolved model under an assistant reply. */
export function UsageFooter({ usage, model }: UsageFooterProps) {
  const cache = usage.cacheReadTokens + usage.cacheWriteTokens;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint tabular-nums">
      <span title="Tokens de entrada">entrada {formatTokens(usage.inputTokens)}</span>
      <span title="Tokens de salida">salida {formatTokens(usage.outputTokens)}</span>
      {cache > 0 ? (
        <span title={`Lectura ${usage.cacheReadTokens} · escritura ${usage.cacheWriteTokens}`}>
          caché {formatTokens(cache)}
        </span>
      ) : null}
      {usage.reasoningTokens ? <span>razonamiento {formatTokens(usage.reasoningTokens)}</span> : null}
      {usage.durationMs != null ? (
        <span className="inline-flex items-center gap-1">
          <Timer className="size-3" />
          {formatDuration(usage.durationMs)}
        </span>
      ) : null}
      {usage.cost ? (
        <span className="inline-flex items-center gap-1" title="Coste cobrado">
          <Coins className="size-3" />
          {formatCents(usage.cost.chargedCents)}
        </span>
      ) : null}
      {usage.resolvedModel && usage.resolvedModel !== model ? (
        <span className="inline-flex items-center gap-1 font-mono" title="Modelo resuelto">
          <Cpu className="size-3" />
          {usage.resolvedModel}
        </span>
      ) : null}
    </div>
  );
}
