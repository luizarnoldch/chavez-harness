"use client";

import { useMemo } from "react";
import {
  ChevronDown,
  CircleAlert,
  FileCode,
  FolderOpen,
  Globe,
  ListTodo,
  LoaderCircle,
  Pencil,
  Search,
  SquareTerminal,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { DiffView } from "./DiffView";
import {
  describeToolCall,
  diffStats,
  formatToolArgs,
  looksLikeUnifiedDiff,
  parseUnifiedDiff,
  toolPath,
  truncate,
  type ToolKind,
  type ToolRow,
} from "./tool-summary";

const KIND_ICON: Record<ToolKind, LucideIcon> = {
  read: FileCode,
  edit: Pencil,
  search: Search,
  shell: SquareTerminal,
  web: Globe,
  list: FolderOpen,
  todo: ListTodo,
  other: Zap,
};

const KIND_TONE: Partial<Record<ToolKind, string>> = {
  edit: "bg-diff-add-soft text-diff-add",
  shell: "text-foreground",
  todo: "bg-status-planned-soft text-status-planned",
};

const MAX_TEXT = 4000;

/** One tool call (persisted `tool-call` part or a live draft tool), collapsible. */
export function ToolCallCard({ tool }: { tool: ToolRow }) {
  const summary = describeToolCall(tool);
  const Icon = KIND_ICON[summary.kind];
  const running = tool.status === "running";
  const failed = tool.status === "error";

  const argsText = formatToolArgs(tool.args);
  const resultText = tool.result?.trim() ? tool.result : null;
  const isDiff = resultText != null && looksLikeUnifiedDiff(resultText);
  const stats = useMemo(
    () => (isDiff && resultText ? diffStats(parseUnifiedDiff(resultText)) : null),
    [isDiff, resultText],
  );
  const fullPath = toolPath(tool);

  return (
    <Collapsible
      defaultOpen={failed}
      className="group/tool overflow-hidden rounded-lg border border-border bg-card"
    >
      <CollapsibleTrigger className="flex min-h-[42px] w-full items-center gap-2 px-3 text-left text-[13px] [-webkit-tap-highlight-color:transparent]">
        <span
          className={cn(
            "inline-flex size-[22px] shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-[13px]",
            KIND_TONE[summary.kind],
            failed && "bg-destructive-soft text-destructive",
          )}
        >
          {running ? (
            <LoaderCircle className="animate-spin" />
          ) : failed ? (
            <CircleAlert />
          ) : (
            <Icon />
          )}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-muted-foreground",
            running && "shimmer-text",
          )}
        >
          {summary.label}
          {summary.target ? (
            <>
              {" "}
              <code className="font-mono text-[0.92em] text-foreground">{summary.target}</code>
            </>
          ) : null}
        </span>
        {stats ? (
          <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] font-semibold">
            <span className="text-diff-add">+{stats.additions}</span>
            <span className="text-diff-del">−{stats.deletions}</span>
          </span>
        ) : failed ? (
          <span className="shrink-0 text-[11px] font-semibold text-destructive">Error</span>
        ) : null}
        <ChevronDown className="size-3.5 shrink-0 text-faint transition-transform group-data-[state=open]/tool:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-2 border-t border-border p-3 text-[13px]">
          {fullPath ? (
            <div className="font-mono text-[11px] break-all text-faint">{fullPath}</div>
          ) : null}
          {argsText ? (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-[0.06em] text-faint uppercase">args</span>
              <pre className="max-h-64 overflow-auto rounded-md bg-muted p-2 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
                {truncate(argsText, MAX_TEXT)}
              </pre>
            </div>
          ) : null}
          {resultText ? (
            isDiff ? (
              <DiffView diff={resultText} />
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold tracking-[0.06em] text-faint uppercase">
                  resultado
                </span>
                <pre
                  className={cn(
                    "max-h-80 overflow-auto rounded-md bg-muted p-2 font-mono text-xs whitespace-pre-wrap",
                    failed ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {truncate(resultText, MAX_TEXT)}
                </pre>
              </div>
            )
          ) : null}
          {!argsText && !resultText ? (
            <span className="text-xs text-faint">{running ? "En curso…" : "Sin detalle"}</span>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
