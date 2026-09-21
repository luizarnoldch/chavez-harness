import {
  CHAT_GENERATE_TIMEOUT_MS,
  NO_DAEMON_ERROR,
  NO_HOST_ERROR,
  type ChatGenerateResult,
  type ChatMessageDto,
  type ChatMessageUsage,
  type ChatMode,
} from "@chavez-harness/shared";
import type { Hub } from "../ws/hub.ts";
import type { PendingRegistry } from "../ws/pending.ts";
import type { ProviderJobStore } from "./provider-jobs.ts";

export type RunCursorGenerateArgs = {
  hub: Hub;
  pending: PendingRegistry;
  jobs: ProviderJobStore;
  userId: string;
  workspaceId: string;
  workspacePath: string;
  sessionId: string;
  model: string;
  prompt: string;
  mode: ChatMode;
  messageId?: string;
  agentId?: string | null;
};

export type CursorGenerateOutcome = {
  text: string;
  agentId: string;
  usage?: ChatMessageUsage;
  parts?: ChatMessageDto["parts"];
};

export async function runCursorGenerate(
  args: RunCursorGenerateArgs,
): Promise<CursorGenerateOutcome> {
  const daemon = args.hub.findDaemon(args.userId, args.workspaceId);
  if (!daemon || !daemon.workspacePath) {
    if (!args.hub.findHost(args.userId)) {
      throw new Error(NO_HOST_ERROR);
    }
    throw new Error(NO_DAEMON_ERROR);
  }

  const job = args.jobs.create(args.userId, "cursor");
  const requestId = crypto.randomUUID();
  const waitPromise = args.pending.wait<ChatGenerateResult>(
    requestId,
    CHAT_GENERATE_TIMEOUT_MS,
  );

  args.hub.sendTo(daemon.connectionId, {
    type: "chat.generate.dispatch",
    push: true,
    eventId: crypto.randomUUID(),
    requestId,
    workspaceId: args.workspaceId,
    sessionId: args.sessionId,
    messageId: args.messageId ?? requestId,
    model: args.model,
    prompt: args.prompt,
    mode: args.mode,
    path: daemon.workspacePath,
    jobId: job.jobId,
    unwrapToken: job.unwrapToken,
    ...(args.agentId ? { agentId: args.agentId } : {}),
  });

  const result = await waitPromise;
  if (!result.ok || !result.data?.text || !result.data.agentId) {
    throw new Error(result.error ?? "Cursor generate failed");
  }
  return {
    text: result.data.text,
    agentId: result.data.agentId,
    ...(result.data.usage ? { usage: result.data.usage } : {}),
    ...(result.data.parts?.length ? { parts: result.data.parts } : {}),
  };
}
