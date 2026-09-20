import type { ChatMessageUsage } from "@chavez-harness/shared";
import { TextAttributes } from "@opentui/core";
import { useState } from "react";
import type { Turn } from "../../session/store";
import type { AppMode } from "../../../lib/types/mode";

export type PendingTurn = {
  text: string;
  mode: AppMode;
};

type MessageListProps = {
  turns: Turn[];
  pending?: PendingTurn | null;
  /** Live assistant draft while generate streams. */
  streamingDraft?: string | null;
};

const ERROR_COLOR = "#f7768e";

export function MessageList({
  turns,
  pending = null,
  streamingDraft = null,
}: MessageListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const empty =
    turns.length === 0 && pending == null && !streamingDraft;

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <scrollbox flexGrow={1} stickyScroll stickyStart="bottom">
      {empty ? (
        <box padding={1}>
          <text attributes={TextAttributes.DIM}>Sin mensajes aún</text>
        </box>
      ) : (
        <>
          {turns.map((turn) =>
            turn.role === "user" ? (
              <UserMessage key={turn.id} mode={turn.mode} text={turn.text} />
            ) : turn.status === "error" ? (
              <ErrorMessage key={turn.id} turn={turn} />
            ) : (
              <BotMessage
                key={turn.id}
                turn={turn}
                expanded={expandedIds.has(turn.id)}
                onToggle={() => toggleExpanded(turn.id)}
              />
            ),
          )}
          {pending ? <UserMessage mode={pending.mode} text={pending.text} /> : null}
          {streamingDraft ? (
            <box paddingLeft={1} paddingRight={1} marginBottom={1}>
              <text>
                {streamingDraft}
                <span attributes={TextAttributes.DIM}> ▍</span>
              </text>
            </box>
          ) : null}
        </>
      )}
    </scrollbox>
  );
}

function UserMessage({ mode, text }: { mode: AppMode; text: string }) {
  return (
    <box paddingLeft={1} paddingRight={1} marginBottom={1}>
      <text>
        <span attributes={TextAttributes.DIM}>[{mode}] </span>
        {text}
      </text>
    </box>
  );
}

function formatTokens(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(n);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1).replace(/\.0$/, "")}s`;
}

function formatCostCents(cents: number): string {
  return `$${(cents / 100).toFixed(4)}`;
}

export function compactUsageSummary(
  model: string,
  usage: ChatMessageUsage | null | undefined,
): string {
  const parts = [model];
  if (usage && usage.totalTokens > 0) {
    parts.push(`${formatTokens(usage.totalTokens)} tok`);
  }
  if (usage?.durationMs != null) {
    parts.push(formatDuration(usage.durationMs));
  }
  return parts.join(" · ");
}

function BotMessage({
  turn,
  expanded,
  onToggle,
}: {
  turn: Extract<Turn, { role: "assistant" }>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const summary = compactUsageSummary(turn.model, turn.usage);

  return (
    <box paddingLeft={1} paddingRight={1} marginBottom={1} flexDirection="column">
      <text>{turn.text}</text>
      <box flexDirection="row" onMouseDown={onToggle}>
        <text fg="#7aa2f7">{expanded ? "▾" : "▸"}</text>
        <text attributes={TextAttributes.DIM}> {summary}</text>
      </box>
      {expanded ? (
        <MessageUsagePanel
          provider={turn.provider}
          model={turn.model}
          usage={turn.usage}
        />
      ) : null}
    </box>
  );
}

function ErrorMessage({ turn }: { turn: Extract<Turn, { role: "assistant" }> }) {
  return (
    <box paddingLeft={1} paddingRight={1} marginBottom={1} flexDirection="column">
      <text>
        <span fg={ERROR_COLOR}>Error: {turn.error ?? "No se pudo obtener la respuesta"}</span>
      </text>
      <text attributes={TextAttributes.DIM}> {turn.model}</text>
    </box>
  );
}

type MessageUsagePanelProps = {
  provider: string | null;
  model: string;
  usage?: ChatMessageUsage | null;
};

export function MessageUsagePanel({
  provider,
  model,
  usage,
}: MessageUsagePanelProps) {
  const resolved = usage?.resolvedModel ?? model;

  return (
    <box
      border
      borderColor="#414868"
      title="Meta"
      paddingLeft={1}
      paddingRight={1}
      flexDirection="column"
      marginTop={0}
    >
      <MetaRow label="Provider" value={provider ?? "—"} />
      <MetaRow label="Modelo" value={resolved} />
      {usage ? (
        <>
          <MetaRow label="Input" value={String(usage.inputTokens)} />
          <MetaRow label="Output" value={String(usage.outputTokens)} />
          <MetaRow label="Cache R" value={String(usage.cacheReadTokens)} />
          <MetaRow label="Cache W" value={String(usage.cacheWriteTokens)} />
          {usage.reasoningTokens != null ? (
            <MetaRow label="Reasoning" value={String(usage.reasoningTokens)} />
          ) : null}
          <MetaRow label="Total" value={String(usage.totalTokens)} />
          {usage.durationMs != null ? (
            <MetaRow label="Duración" value={formatDuration(usage.durationMs)} />
          ) : null}
          {usage.cost ? (
            <MetaRow
              label="Coste"
              value={`${formatCostCents(usage.cost.chargedCents)} (raw ${formatCostCents(usage.cost.rawCostCents)})`}
            />
          ) : null}
        </>
      ) : (
        <text attributes={TextAttributes.DIM}>Sin datos de uso</text>
      )}
    </box>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <box flexDirection="row" height={1}>
      <text attributes={TextAttributes.BOLD}>{label} </text>
      <text>{value}</text>
    </box>
  );
}
