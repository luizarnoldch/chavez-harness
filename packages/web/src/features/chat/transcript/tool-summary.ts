/**
 * Tool-call summaries and unified-diff parsing for the chat transcript.
 * Same heuristics as the CLI (`packages/cli/src/features/chat/pane/ToolCallRow.tsx`)
 * and the mock's `transcript.toolSummary` / `diffHtml`, with Spanish labels.
 */

export type ToolStatus = "running" | "completed" | "error";

export type ToolRow = {
  id: string;
  name: string;
  status: ToolStatus;
  args?: Record<string, unknown>;
  result?: string;
};

export type ToolKind = "read" | "edit" | "search" | "shell" | "web" | "list" | "todo" | "other";

export type ToolSummary = {
  kind: ToolKind;
  label: string;
  /** Path / pattern / command shown in monospace after the label. */
  target: string | null;
  /** `label target` as one line (CLI parity, tests). */
  text: string;
};

const LABELS: Record<string, string> = {
  read: "Leer",
  edit: "Editar",
  write: "Escribir",
  delete: "Borrar",
  grep: "Grep",
  glob: "Glob",
  ls: "Listar",
  semsearch: "Búsqueda semántica",
  readlints: "Lints",
  readtodos: "Leer to-dos",
  todowrite: "To-dos",
  updatetodos: "To-dos",
  writetodos: "To-dos",
  shell: "Shell",
  websearch: "Buscar en la web",
  webfetch: "Abrir URL",
  askquestion: "Pregunta",
  await: "Esperar",
};

export function toolKind(name: string): ToolKind {
  if (/todo/i.test(name)) return "todo";
  if (/web|fetch|url|browse/i.test(name)) return "web";
  if (/edit|write|strreplace|apply|patch|delete/i.test(name)) return "edit";
  if (/^(ls|glob)$|list/i.test(name)) return "list";
  if (/shell|bash|exec|terminal|run|command/i.test(name)) return "shell";
  if (/grep|search|rg\b|find/i.test(name)) return "search";
  if (/read|file|cat|lint/i.test(name)) return "read";
  return "other";
}

/** `read_file` / `semSearch` → "Read file" / "Sem search" when no Spanish label exists. */
export function displayToolName(name: string): string {
  if (!name) return "Herramienta";
  const known = LABELS[name.replace(/[_\s-]/g, "").toLowerCase()];
  if (known) return known;
  const words = name
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function stringArg(args: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function shortPath(path: string): string {
  if (path.length <= 56) return path;
  const parts = path.split("/");
  if (parts.length <= 2) return truncate(path, 56);
  return `…/${parts.slice(-2).join("/")}`;
}

export function describeToolCall(tool: { name: string; args?: Record<string, unknown> }): ToolSummary {
  const args = tool.args ?? {};
  const kind = toolKind(tool.name);
  const label = displayToolName(tool.name);

  const path = stringArg(
    args,
    "path",
    "file",
    "filePath",
    "file_path",
    "target_file",
    "targetFile",
    "target",
    "directory",
    "dir",
  );
  const pattern = stringArg(args, "pattern", "query", "search_term", "searchTerm", "globPattern", "glob");
  const command = stringArg(args, "command", "cmd", "script");
  const url = stringArg(args, "url");

  let target: string | null = null;
  if ((kind === "edit" || kind === "read") && path) target = shortPath(path);
  else if (kind === "search" && pattern) {
    target = `${truncate(pattern, 48)}${path ? ` en ${shortPath(path)}` : ""}`;
  } else if (kind === "shell" && command) target = truncate(command, 64);
  else if (kind === "web" && (url || pattern)) target = truncate((url ?? pattern)!, 64);
  else if (kind === "list" && (path || pattern)) target = path ? shortPath(path) : truncate(pattern!, 48);
  else if (path) target = shortPath(path);
  else if (pattern) target = truncate(pattern, 48);
  else if (command) target = truncate(command, 64);
  else if (url) target = truncate(url, 64);

  return { kind, label, target, text: target ? `${label} ${target}` : label };
}

export function summarizeToolCall(tool: { name: string; args?: Record<string, unknown> }): string {
  return describeToolCall(tool).text;
}

/** Full path for the expanded card header (not shortened). */
export function toolPath(tool: { args?: Record<string, unknown> }): string | null {
  return stringArg(tool.args ?? {}, "path", "file", "filePath", "file_path", "target_file", "targetFile") ?? null;
}

export function formatToolArgs(args: Record<string, unknown> | undefined): string | null {
  if (!args || Object.keys(args).length === 0) return null;
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

export function looksLikeUnifiedDiff(text: string): boolean {
  return (
    /^diff --git /m.test(text) ||
    /^--- /m.test(text) ||
    /^\+\+\+ /m.test(text) ||
    /^@@ /m.test(text)
  );
}

export type DiffRow =
  | { kind: "meta"; text: string }
  | { kind: "hunk"; text: string }
  | { kind: "add"; text: string; newNo: number }
  | { kind: "del"; text: string; oldNo: number }
  | { kind: "ctx"; text: string; oldNo: number; newNo: number };

const HUNK = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

/**
 * Unified diff → rows with old/new line numbers. Headers (`diff --git`,
 * `---`, `+++`, `index`) are only meta outside a hunk body, so a removed
 * line that happens to start with `--` is still a deletion.
 */
export function parseUnifiedDiff(text: string): DiffRow[] {
  const rows: DiffRow[] = [];
  let oldNo = 0;
  let newNo = 0;
  let oldLeft = 0;
  let newLeft = 0;

  const lines = text.replace(/\n$/, "").split("\n");
  for (const line of lines) {
    const hunk = HUNK.exec(line);
    if (hunk) {
      oldNo = Number(hunk[1]);
      newNo = Number(hunk[3]);
      oldLeft = hunk[2] === undefined ? 1 : Number(hunk[2]);
      newLeft = hunk[4] === undefined ? 1 : Number(hunk[4]);
      rows.push({ kind: "hunk", text: line });
      continue;
    }

    const inHunk = oldLeft > 0 || newLeft > 0;
    if (!inHunk || line.startsWith("diff --git ")) {
      oldLeft = 0;
      newLeft = 0;
      rows.push({ kind: "meta", text: line });
      continue;
    }

    const sign = line.charAt(0);
    const body = line.slice(1);
    if (sign === "+") {
      rows.push({ kind: "add", text: body, newNo: newNo++ });
      newLeft -= 1;
    } else if (sign === "-") {
      rows.push({ kind: "del", text: body, oldNo: oldNo++ });
      oldLeft -= 1;
    } else if (sign === "\\") {
      // "\ No newline at end of file"
      rows.push({ kind: "meta", text: line });
    } else {
      rows.push({ kind: "ctx", text: sign === " " ? body : line, oldNo: oldNo++, newNo: newNo++ });
      oldLeft -= 1;
      newLeft -= 1;
    }
  }
  return rows;
}

export function diffStats(rows: DiffRow[]): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const row of rows) {
    if (row.kind === "add") additions += 1;
    if (row.kind === "del") deletions += 1;
  }
  return { additions, deletions };
}
