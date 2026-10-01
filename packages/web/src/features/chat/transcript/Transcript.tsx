"use client";

import type { ChatMessageDto } from "@chavez-harness/shared";
import { MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ChatMarkdown, ChatMarkdownStyles } from "../markdown/ChatMarkdown";
import type { GenerateStream } from "../live/generate-stream";
import { AgentWho, MessageItem } from "./MessageItem";
import { ToolCallCard } from "./ToolCallCard";

type TranscriptProps = {
  messages: ChatMessageDto[];
  stream: GenerateStream | null;
};

/** Persisted messages + the live draft (tool calls and streamed text) of the current turn. */
export function Transcript({ messages, stream }: TranscriptProps) {
  const hasDraft = Boolean(stream && (stream.draftText || stream.draftTools.length > 0));

  if (messages.length === 0 && !hasDraft) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="Sin mensajes todavía"
        description="Escribe abajo o usa el TUI: los mensajes se sincronizan en ambos sentidos."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ChatMarkdownStyles />
      {messages.map((message, idx) => {
        const prev = messages[idx - 1];
        const showWho =
          message.role === "assistant" && (!prev || prev.role !== "assistant");
        return <MessageItem key={message.id} message={message} showWho={showWho} />;
      })}
      {stream && hasDraft ? (
        <div className="min-w-0">
          <AgentWho live />
          <div className="flex flex-col gap-2">
            {stream.draftTools.map((tool) => (
              <ToolCallCard key={tool.id} tool={tool} />
            ))}
            {stream.draftText ? (
              <div className="relative">
                <ChatMarkdown source={stream.draftText} />
                <span className="stream-caret" aria-hidden="true" />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
