"use client";

import { memo } from "react";
import type { ChatMessageDto } from "@chavez-harness/shared";
import { Bot, CircleAlert, FileText } from "lucide-react";
import { modeLabel, modeTone, StatusPill } from "@/components/common/StatusPill";
import { formatTime } from "@/lib/format";
import { ChatMarkdown } from "../markdown/ChatMarkdown";
import { blocksFromParts, textFromParts } from "../state/messages";
import { ReasoningBlock } from "./ReasoningBlock";
import { ToolCallCard } from "./ToolCallCard";
import { UsageFooter } from "./UsageFooter";

type MessageItemProps = {
  message: ChatMessageDto;
  /** Label the agent at the start of each of its turns. */
  showWho: boolean;
};

export function AgentWho({ mode, time, live }: { mode?: ChatMessageDto["mode"]; time?: string; live?: boolean }) {
  return (
    <div className="mt-2 mb-1 flex items-center gap-2 text-xs font-bold text-agent">
      <Bot className="size-3.5" />
      <span>Agente</span>
      {mode ? (
        <StatusPill size="sm" tone={modeTone(mode)}>
          {modeLabel(mode)}
        </StatusPill>
      ) : null}
      {live ? <span className="font-medium text-faint">en curso</span> : null}
      {time ? <time className="ml-auto font-normal text-faint tabular-nums">{time}</time> : null}
    </div>
  );
}

function UserMessage({ message }: { message: ChatMessageDto }) {
  const text = textFromParts(message.parts);
  return (
    <div className="mt-2 flex flex-col items-end">
      <div className="max-w-[min(88%,560px)] rounded-[16px_16px_5px_16px] border border-primary/25 bg-primary-soft px-3 py-2 text-[0.9375rem] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
        {text}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-faint">
        {message.mode ? (
          <span className={message.mode === "build" ? "text-stage-build" : "text-stage-plan"}>
            {modeLabel(message.mode)}
          </span>
        ) : null}
        {message.status === "pending" ? <span>· Enviando…</span> : null}
        <time className="tabular-nums">{formatTime(message.createdAt)}</time>
      </div>
    </div>
  );
}

function AssistantMessage({ message, showWho }: MessageItemProps) {
  const blocks = blocksFromParts(message.parts);
  return (
    <div className="min-w-0">
      {showWho ? <AgentWho mode={message.mode} time={formatTime(message.createdAt)} /> : null}
      <div className="flex flex-col gap-2">
        {blocks.map((block) => {
          if (block.kind === "reasoning") return <ReasoningBlock key={block.key} text={block.text} />;
          if (block.kind === "tool") {
            return (
              <ToolCallCard
                key={block.key}
                tool={{
                  id: block.part.id,
                  name: block.part.name,
                  status: "completed",
                  args: block.part.args,
                  result: block.part.result,
                }}
              />
            );
          }
          return <ChatMarkdown key={block.key} source={block.text} />;
        })}
        {blocks.length === 0 && message.status !== "error" ? (
          <span className="text-sm text-faint">{message.status === "pending" ? "…" : "(sin texto)"}</span>
        ) : null}
        {message.status === "error" || message.error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive-soft px-3 py-2 text-[13px]"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <span>
              <span className="font-bold">La respuesta falló</span>
              <br />
              <span className="text-muted-foreground">{message.error ?? "Error desconocido"}</span>
            </span>
          </div>
        ) : null}
        {message.usage ? <UsageFooter usage={message.usage} model={message.model} /> : null}
        {!message.usage && message.provider && message.model ? (
          <span className="font-mono text-[11px] text-faint">
            {message.provider} · {message.model}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SystemMessage({ message }: { message: ChatMessageDto }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-dashed border-border-strong px-3 py-2 text-[13px] text-muted-foreground">
      <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.06em] text-agent uppercase">
        <FileText className="size-3" />
        Sistema
        <time className="ml-auto font-normal tracking-normal text-faint normal-case">
          {formatTime(message.createdAt)}
        </time>
      </span>
      <span className="whitespace-pre-wrap">{textFromParts(message.parts)}</span>
    </div>
  );
}

export const MessageItem = memo(function MessageItem({ message, showWho }: MessageItemProps) {
  if (message.role === "user") return <UserMessage message={message} />;
  if (message.role === "system") return <SystemMessage message={message} />;
  return <AssistantMessage message={message} showWho={showWho} />;
});
