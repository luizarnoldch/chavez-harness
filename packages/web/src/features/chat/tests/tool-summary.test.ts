import { describe, expect, test } from "bun:test";
import {
  describeToolCall,
  diffStats,
  displayToolName,
  looksLikeUnifiedDiff,
  parseUnifiedDiff,
  summarizeToolCall,
  toolKind,
} from "../transcript/tool-summary";

describe("summarizeToolCall", () => {
  test("resume path / pattern / command como el CLI", () => {
    expect(summarizeToolCall({ name: "read", args: { path: "a/b.ts" } })).toBe("Leer a/b.ts");
    expect(summarizeToolCall({ name: "grep", args: { pattern: "foo", path: "src" } })).toBe(
      "Grep foo en src",
    );
    expect(summarizeToolCall({ name: "shell", args: { command: "bun test" } })).toBe(
      "Shell bun test",
    );
  });

  test("acorta paths largos a los dos últimos segmentos", () => {
    const path = "packages/web/src/features/chat/transcript/components/very-long-name/ToolCallCard.tsx";
    expect(summarizeToolCall({ name: "edit", args: { path } })).toBe(
      "Editar …/very-long-name/ToolCallCard.tsx",
    );
  });

  test("trunca comandos largos con elipsis", () => {
    const command = `bun run ${"x".repeat(100)}`;
    const text = summarizeToolCall({ name: "shell", args: { command } });
    expect(text.endsWith("…")).toBe(true);
    expect(text.length).toBe("Shell ".length + 64);
  });

  test("sin args conocidos queda solo la etiqueta", () => {
    expect(summarizeToolCall({ name: "askQuestion", args: { foo: 1 } })).toBe("Pregunta");
    expect(summarizeToolCall({ name: "custom_tool" })).toBe("Custom tool");
  });

  test("web usa url o query", () => {
    expect(summarizeToolCall({ name: "webFetch", args: { url: "https://bun.sh" } })).toBe(
      "Abrir URL https://bun.sh",
    );
    expect(describeToolCall({ name: "webSearch", args: { query: "opentui" } })).toMatchObject({
      kind: "web",
      target: "opentui",
    });
  });
});

describe("toolKind / displayToolName", () => {
  test("clasifica los tools del SDK de Cursor", () => {
    expect(toolKind("read")).toBe("read");
    expect(toolKind("readLints")).toBe("read");
    expect(toolKind("readTodos")).toBe("todo");
    expect(toolKind("edit")).toBe("edit");
    expect(toolKind("write")).toBe("edit");
    expect(toolKind("grep")).toBe("search");
    expect(toolKind("semSearch")).toBe("search");
    expect(toolKind("glob")).toBe("list");
    expect(toolKind("ls")).toBe("list");
    expect(toolKind("shell")).toBe("shell");
    expect(toolKind("run_terminal_cmd")).toBe("shell");
    expect(toolKind("webSearch")).toBe("web");
    expect(toolKind("await")).toBe("other");
  });

  test("camelCase / snake_case sin etiqueta conocida", () => {
    expect(displayToolName("listDirectory")).toBe("List directory");
    expect(displayToolName("read_file")).toBe("Read file");
    expect(displayToolName("semSearch")).toBe("Búsqueda semántica");
  });
});

describe("looksLikeUnifiedDiff", () => {
  test("detecta marcadores de diff unificado", () => {
    expect(looksLikeUnifiedDiff("@@ -1 +1 @@\n-a\n+b")).toBe(true);
    expect(looksLikeUnifiedDiff("diff --git a/x b/x\n")).toBe(true);
    expect(looksLikeUnifiedDiff("hola mundo")).toBe(false);
    expect(looksLikeUnifiedDiff("a - b + c")).toBe(false);
  });
});

describe("parseUnifiedDiff", () => {
  const diff = [
    "diff --git a/src/a.ts b/src/a.ts",
    "index 1111111..2222222 100644",
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
    "@@ -10,3 +10,4 @@ export function a() {",
    " const x = 1;",
    "-const y = 2;",
    "--- not a header, a removed line",
    "+const y = 3;",
    "+const z = 4;",
    " return x;",
  ].join("\n");

  test("cabeceras como meta y numeración por lado", () => {
    const rows = parseUnifiedDiff(diff);
    expect(rows.slice(0, 4).every((r) => r.kind === "meta")).toBe(true);
    expect(rows[4]).toEqual({ kind: "hunk", text: "@@ -10,3 +10,4 @@ export function a() {" });
    expect(rows[5]).toEqual({ kind: "ctx", text: "const x = 1;", oldNo: 10, newNo: 10 });
    expect(rows[6]).toEqual({ kind: "del", text: "const y = 2;", oldNo: 11 });
    // inside a hunk body a "---" line is a deletion, not a file header
    expect(rows[7]).toEqual({ kind: "del", text: "-- not a header, a removed line", oldNo: 12 });
    expect(rows[8]).toEqual({ kind: "add", text: "const y = 3;", newNo: 11 });
    expect(rows[9]).toEqual({ kind: "add", text: "const z = 4;", newNo: 12 });
    expect(rows[10]).toEqual({ kind: "ctx", text: "return x;", oldNo: 13, newNo: 13 });
  });

  test("diffStats cuenta + y −", () => {
    expect(diffStats(parseUnifiedDiff(diff))).toEqual({ additions: 2, deletions: 2 });
  });

  test("hunk sin conteo explícito vale 1 línea", () => {
    const rows = parseUnifiedDiff("@@ -1 +1 @@\n-a\n+b\ntrailing text");
    expect(rows.map((r) => r.kind)).toEqual(["hunk", "del", "add", "meta"]);
  });
});
