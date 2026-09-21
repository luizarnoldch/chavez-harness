import type { ChatGenerateToolCall } from "@chavez-harness/shared";
import { TextAttributes } from "@opentui/core";
import { useState } from "react";
import type { ToolCallPart } from "../../session/store";

const ACCENT = "#7aa2f7";
const OK = "#9ece6a";
const ERR = "#f7768e";
const WARN = "#e0af68";

export type ToolRowModel = {
  id: string;
  name: string;
  status: "running" | "completed" | "error";
  args?: Record<string, unknown>;
  result?: string;
};

export function toolRowFromPart(part: ToolCallPart): ToolRowModel {
  return {
    id: part.id,
    name: part.name,
    status: "completed",
    args: part.args,
    result: part.result,
  };
}

export function toolRowFromDraft(tool: ChatGenerateToolCall): ToolRowModel {
  return {
    id: tool.id,
    name: tool.name,
    status: tool.status,
    args: tool.args,
    result: tool.result,
  };
}

export function summarizeToolCall(tool: {
  name: string;
  args?: Record<string, unknown>;
}): string {
  const args = tool.args ?? {};
  const name = tool.name;
  const path =
    stringArg(args, "path") ??
    stringArg(args, "file") ??
    stringArg(args, "filePath") ??
    stringArg(args, "target");
  const pattern =
    stringArg(args, "pattern") ??
    stringArg(args, "query") ??
    stringArg(args, "search_term");
  const command =
    stringArg(args, "command") ??
    stringArg(args, "cmd") ??
    stringArg(args, "script");

  const label = displayToolName(name);

  if (isEditLike(name) && path) return `${label} ${shortPath(path)}`;
  if (isReadLike(name) && path) return `${label} ${shortPath(path)}`;
  if (isGrepLike(name) && pattern) {
    const where = path ? ` in ${shortPath(path)}` : "";
    return `${label} ${truncate(pattern, 48)}${where}`;
  }
  if (isShellLike(name) && command) return `${label} ${truncate(command, 64)}`;
  if (path) return `${label} ${shortPath(path)}`;
  if (pattern) return `${label} ${truncate(pattern, 48)}`;
  if (command) return `${label} ${truncate(command, 64)}`;
  return label;
}

function displayToolName(name: string): string {
  if (!name) return "tool";
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isReadLike(name: string): boolean {
  return /read|file|cat/i.test(name);
}

function isGrepLike(name: string): boolean {
  return /grep|search|rg/i.test(name);
}

function isShellLike(name: string): boolean {
  return /shell|bash|exec|terminal|run/i.test(name);
}

function isEditLike(name: string): boolean {
  return /edit|write|strreplace|apply|patch/i.test(name);
}

function stringArg(
  args: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = args[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function shortPath(path: string): string {
  if (path.length <= 56) return path;
  const parts = path.split("/");
  if (parts.length <= 2) return truncate(path, 56);
  return `…/${parts.slice(-2).join("/")}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function looksLikeUnifiedDiff(text: string): boolean {
  return (
    /^diff --git /m.test(text) ||
    /^--- /m.test(text) ||
    /^\+\+\+ /m.test(text) ||
    /^@@ /m.test(text)
  );
}

function statusGlyph(status: ToolRowModel["status"]): {
  glyph: string;
  color: string;
} {
  if (status === "running") return { glyph: "◐", color: WARN };
  if (status === "error") return { glyph: "✗", color: ERR };
  return { glyph: "✔", color: OK };
}

type ToolCallRowProps = {
  tool: ToolRowModel;
  /** When set, expansion is controlled by parent (e.g. streaming list). */
  expanded?: boolean;
  onToggle?: () => void;
};

export function ToolCallRow({ tool, expanded, onToggle }: ToolCallRowProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const isExpanded = expanded ?? localExpanded;
  const toggle =
    onToggle ??
    (() => {
      setLocalExpanded((v) => !v);
    });
  const { glyph, color } = statusGlyph(tool.status);
  const summary = summarizeToolCall(tool);
  const argsText =
    tool.args && Object.keys(tool.args).length > 0
      ? safeJson(tool.args)
      : null;
  const resultText = tool.result?.trim() ? tool.result : null;
  const showDiff = resultText != null && looksLikeUnifiedDiff(resultText);

  return (
    <box flexDirection="column" marginBottom={0}>
      <box flexDirection="row" onMouseDown={toggle}>
        <text fg={color}>{glyph} </text>
        <text fg={ACCENT}>{isExpanded ? "▾ " : "▸ "}</text>
        <text>{summary}</text>
      </box>
      {isExpanded ? (
        <box
          flexDirection="column"
          paddingLeft={2}
          marginTop={0}
          marginBottom={0}
        >
          {argsText ? (
            <>
              <text attributes={TextAttributes.DIM}>args</text>
              <text>{truncate(argsText, 800)}</text>
            </>
          ) : null}
          {resultText ? (
            showDiff ? (
              <box height={Math.min(12, resultText.split("\n").length + 1)}>
                <diff
                  diff={truncateDiff(resultText, 40)}
                  view="unified"
                  showLineNumbers={false}
                />
              </box>
            ) : (
              <>
                <text attributes={TextAttributes.DIM}>result</text>
                <text>{truncate(resultText, 800)}</text>
              </>
            )
          ) : null}
          {!argsText && !resultText ? (
            <text attributes={TextAttributes.DIM}>sin detalle</text>
          ) : null}
        </box>
      ) : null}
    </box>
  );
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function truncateDiff(diff: string, maxLines: number): string {
  const lines = diff.split("\n");
  if (lines.length <= maxLines) return diff;
  return `${lines.slice(0, maxLines).join("\n")}\n…`;
}
