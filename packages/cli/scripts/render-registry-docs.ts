import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { COMMANDS } from "../src/registry/commands";
import { SHORTCUTS } from "../src/registry/shortcuts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const docsDir = join(repoRoot, "docs");

const generatedNote = (source: string) =>
  [
    "> Generado por `bun run docs:registry` en `packages/cli`. No edites la tabla a mano.",
    `> Fuente: \`${source}\`.`,
    "",
  ].join("\n");

function shortcutsDoc(): string {
  const rows = SHORTCUTS.map(
    (shortcut) =>
      `| \`${shortcut.id}\` | ${shortcut.label} | ${shortcut.scope} | ${shortcut.description} |`,
  ).join("\n");

  return [
    "# Atajos de teclado",
    "",
    generatedNote("packages/cli/src/registry/shortcuts.ts"),
    "Cada atajo se define una sola vez en el registro. La UI (status bar, prompt, Tab) lee ese archivo.",
    "",
    "| Id | Teclas | Alcance | Qué hace |",
    "|----|--------|---------|----------|",
    rows,
    "",
  ].join("\n");
}

function commandsDoc(): string {
  const rows = COMMANDS.map(
    (command) => `| \`${command.value}\` | ${command.description} | \`${command.name}\` |`,
  ).join("\n");

  return [
    "# Slash commands",
    "",
    generatedNote("packages/cli/src/registry/commands.ts"),
    "El menú y el submit leen `COMMANDS`. No copies esta tabla en otros documentos.",
    "",
    "| Comando | Qué hace | Nombre |",
    "|---------|----------|--------|",
    rows,
    "",
    "## Cómo añadir un comando",
    "",
    "1. Si hace falta una capacidad nueva, amplía `CommandContext` en [`packages/cli/src/types/commands.tsx`](../packages/cli/src/types/commands.tsx).",
    "2. Añade una entrada en [`packages/cli/src/registry/commands.ts`](../packages/cli/src/registry/commands.ts) con `name`, `description` (español), `value` y `action`.",
    "3. Regenera esta página: `cd packages/cli && bun run docs:registry`.",
    "4. No toques el menú: se lista y filtra solo.",
    "",
    "Dentro de `action`, avisa con `ctx.toast(\"...\", \"success\" | \"info\" | \"error\")`. El texto y el tipo los decide el comando.",
    "Dentro de `action`, abre un diálogo con `ctx.dialog.open(\"id\")` y ciérralo con `ctx.dialog.close()`.",
    "",
    "El filtro está en [`getFilterCommands`](../packages/cli/src/constants/filter-commands.tsx) (nombre o descripción, sin distinguir mayúsculas).",
    "",
    "## Resolución al enviar",
    "",
    "En `Prompt`, al submit:",
    "",
    "1. Match exacto por `value` o `/${name}`.",
    "2. Si no, el ítem filtrado en `selectedCommandIndex`.",
    "3. Si es comando con `action`, se ejecuta y no se hace echo.",
    "4. Texto que empieza por `/` sin match no se envía como mensaje.",
    "5. Cualquier otro texto se envía como echo con el modo actual.",
    "",
  ].join("\n");
}

writeFileSync(join(docsDir, "shortcuts.md"), shortcutsDoc());
writeFileSync(join(docsDir, "commands.md"), commandsDoc());
console.log("Wrote docs/shortcuts.md and docs/commands.md");
