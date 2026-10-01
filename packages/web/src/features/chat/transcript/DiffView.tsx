import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { parseUnifiedDiff, type DiffRow } from "./tool-summary";

const MAX_ROWS = 400;

function lineNo(row: DiffRow): number | "" {
  if (row.kind === "add" || row.kind === "ctx") return row.newNo;
  if (row.kind === "del") return row.oldNo;
  return "";
}

/** Unified diff with line numbers and +/− gutters (mock `.diff`). */
export function DiffView({ diff }: { diff: string }) {
  const rows = useMemo(() => parseUnifiedDiff(diff), [diff]);
  const shown = rows.slice(0, MAX_ROWS);

  return (
    <div role="figure" aria-label="Diff" className="overflow-hidden rounded-md border border-border bg-card">
      <div className="overflow-x-auto font-mono text-[11.5px] leading-[1.55]">
        {shown.map((row, idx) =>
          row.kind === "meta" || row.kind === "hunk" ? (
            <div
              key={idx}
              className={cn(
                "px-3 py-0.5 whitespace-pre text-faint",
                row.kind === "hunk" ? "bg-muted" : "bg-card",
              )}
            >
              {row.text || " "}
            </div>
          ) : (
            <div
              key={idx}
              className={cn(
                "flex min-w-max whitespace-pre",
                row.kind === "add" && "bg-diff-add-soft",
                row.kind === "del" && "bg-diff-del-soft",
                row.kind === "ctx" && "bg-card",
              )}
            >
              <span className="sticky left-0 w-[3em] shrink-0 bg-inherit pr-1.5 text-right text-faint select-none">
                {lineNo(row)}
              </span>
              <span
                className={cn(
                  "w-[1.4em] shrink-0 text-center select-none",
                  row.kind === "add" && "text-diff-add",
                  row.kind === "del" && "text-diff-del",
                )}
              >
                {row.kind === "add" ? "+" : row.kind === "del" ? "−" : " "}
              </span>
              <span className="pr-4">{row.text || " "}</span>
            </div>
          ),
        )}
        {rows.length > MAX_ROWS ? (
          <div className="px-3 py-1 text-faint">… {rows.length - MAX_ROWS} líneas más</div>
        ) : null}
      </div>
    </div>
  );
}
