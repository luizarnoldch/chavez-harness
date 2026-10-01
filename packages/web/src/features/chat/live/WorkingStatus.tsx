import type { ChatGenerateProgressPhase } from "@chavez-harness/shared";
import { describeToolCall } from "../transcript/tool-summary";
import { phaseLabel, type GenerateStream } from "./generate-stream";

type WorkingStatusProps = {
  stream: GenerateStream | null;
  /** This tab is waiting on its own `chat.send` reply. */
  sending: boolean;
};

/** "El agente está trabajando…" line under the transcript (mock `.working`). */
export function WorkingStatus({ stream, sending }: WorkingStatusProps) {
  if (!stream && !sending) return null;

  const phase: ChatGenerateProgressPhase | null = stream?.phase ?? null;
  const runningTool = stream?.draftTools.findLast((t) => t.status === "running");

  return (
    <div className="flex items-center gap-2 py-1 text-[13px] font-medium" role="status" aria-live="polite">
      <span className="working-dots inline-flex gap-[3px]" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="shimmer-text">El agente está trabajando…</span>
      <span className="min-w-0 truncate text-xs font-normal text-faint">
        {phaseLabel(phase)}
        {phase === "tool" && runningTool ? ` · ${describeToolCall(runningTool).text}` : ""}
      </span>
    </div>
  );
}
