import type { ChatMessageUsage, ChatMode } from "@chavez-harness/shared";
import type { Hub } from "../ws/hub.ts";
import type { PendingRegistry } from "../ws/pending.ts";
import { runCursorGenerate } from "./cursor-generate.ts";
import type { ProviderCredentialsService } from "./providers.ts";
import type { ProviderJobStore } from "./provider-jobs.ts";

export type ProviderReplyContext = {
  provider: string;
  model: string;
  text: string;
  workspaceId: string;
  workspacePath: string;
  userId: string;
  sessionId: string;
  mode: ChatMode;
  agentId?: string | null;
  onAgentId?: (agentId: string) => Promise<void>;
};

export type ProviderReplyDeps = {
  hub: Hub;
  pending: PendingRegistry;
  jobs: ProviderJobStore;
  providers: ProviderCredentialsService;
};

export type ProviderReplyResult = {
  text: string;
  usage?: ChatMessageUsage | null;
};

/**
 * Resolve assistant text for a non-local provider.
 * - cursor → daemon + `@cursor/sdk` (local cwd, Agent.resume when agentId set)
 * - openai | antropic | grok → stub until AI SDK server-side lands
 */
export async function resolveProviderReply(
  ctx: ProviderReplyContext,
  deps: ProviderReplyDeps,
): Promise<ProviderReplyResult> {
  const provider = ctx.provider;

  if (provider === "cursor") {
    const configured = await deps.providers.isConfigured(ctx.userId, "cursor");
    if (!configured) {
      throw new Error(
        "No hay API key de Cursor. Usa /connect o seed con CURSOR_API_KEY.",
      );
    }
    const outcome = await runCursorGenerate({
      hub: deps.hub,
      pending: deps.pending,
      jobs: deps.jobs,
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      workspacePath: ctx.workspacePath,
      sessionId: ctx.sessionId,
      model: ctx.model,
      prompt: ctx.text,
      mode: ctx.mode,
      agentId: ctx.agentId,
    });
    if (ctx.onAgentId && outcome.agentId) {
      await ctx.onAgentId(outcome.agentId);
    }
    return {
      text: outcome.text,
      ...(outcome.usage ? { usage: outcome.usage } : {}),
    };
  }

  if (provider === "openai" || provider === "antropic" || provider === "grok") {
    throw new Error(
      `Provider ${provider} aún no implementado (AI SDK en server)`,
    );
  }

  throw new Error(`Provider no implementado: ${provider}`);
}
