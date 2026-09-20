import type {
  ChatMessageDto,
  ChatMessageUsage,
  ChatSessionWithMessagesDto,
} from "@chavez-harness/shared";
import type { AppMode } from "../../lib/types/mode";
import { messageToTurnText } from "../workspace/bridge.ts";

export type UserTurn = {
  id: string;
  role: "user";
  text: string;
  mode: AppMode;
};

export type AssistantTurn = {
  id: string;
  role: "assistant";
  text: string;
  model: string;
  provider: string | null;
  status: "done" | "error";
  error?: string;
  usage?: ChatMessageUsage | null;
};

export type Turn = UserTurn | AssistantTurn;

export type Session = {
  id: string;
  turns: Turn[];
  provider: string;
  model: string;
  mode: AppMode;
};

export function sessionFromDto(dto: ChatSessionWithMessagesDto): Session {
  return {
    id: dto.id,
    provider: dto.provider,
    model: dto.model,
    mode: dto.mode,
    turns: dto.messages.map(messageToTurn).filter((t): t is Turn => t != null),
  };
}

function messageToTurn(message: ChatMessageDto): Turn | null {
  if (message.role === "user") {
    return {
      id: message.id,
      role: "user",
      text: messageToTurnText(message),
      mode: (message.mode as AppMode) ?? "plan",
    };
  }
  if (message.role === "assistant") {
    return {
      id: message.id,
      role: "assistant",
      text: messageToTurnText(message),
      model: message.model ?? "auto",
      provider: message.provider,
      status: message.status === "error" ? "error" : "done",
      usage: message.usage,
      ...(message.error ? { error: message.error } : {}),
    };
  }
  return null;
}

export function shortSessionId(id: string): string {
  return id.slice(0, 8);
}

/** Test helper — clears nothing remote; local tests use bridge reset. */
export function resetSessions(): void {
  // no-op local cache; bridge owns sessions
}
