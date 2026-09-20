# AGENTS.md — Chavez Harness

Contexto operativo para agentes de IA que trabajen en este repositorio.

## Qué es

Monorepo **chavez-harness**: harness TUI de conversación (modos Plan/Build). El trabajo actual está en **`packages/cli`** (`@chavez-harness/cli`): Bun + React 19 + OpenTUI. Los mensajes son **echo local**; no hay agente LLM ni PTY todavía.

## Comandos útiles

```bash
# raíz
bun install
bun run dev:cli

# typecheck CLI
cd packages/cli && bun run typecheck

# regenerar docs de atajos y comandos
cd packages/cli && bun run docs:registry
```

## Archivos clave

| Ruta | Qué tocar |
|------|-----------|
| `packages/cli/src/registry/shortcuts.ts` | Atajos de teclado (fuente de verdad) |
| `packages/cli/src/registry/commands.ts` | Slash commands (fuente de verdad) |
| `packages/cli/src/index.tsx` | Layout root, Tab → mode, estado |
| `packages/cli/src/components/StatusBar.tsx` | Chips Plan/Build, hints |
| `packages/cli/src/components/MessageList.tsx` | Historial echo |
| `packages/cli/src/components/CommandMenu.tsx` | Lista `/` (máx. 8 visibles) |
| `packages/cli/src/components/Prompt.tsx` | Input, altura ≤25%, lee atajos del registro |
| `packages/cli/src/constants/filter-commands.tsx` | Filtro del catálogo |
| `packages/cli/src/types/commands.tsx` | `Command` / `CommandContext` |

## Convenciones

- **OpenTUI, no DOM**: JSX es `@opentui/react` (`box`, `text`, `textarea`, `scrollbox`). No uses HTML/CSS web.
- Antes de inventar APIs OpenTUI, consulta skills en `packages/cli/.cursor/skills/` (`opentui-components`, `opentui-react`, `opentui-testing`).
- **Paleta** en uso: chrome `#1f2335` / `#414868` / `#7aa2f7`; Plan `#e0af68`; Build `#9ece6a`.
- Copy de UI orientada al usuario: **español** (placeholders, vacíos, hints).
- Documentación humana: `docs/` (empezar por `docs/README.md`). Atajos y comandos solo en `packages/cli/src/registry/`; regenerar con `cd packages/cli && bun run docs:registry`.

## No hacer (salvo que el usuario lo pida)

- Reintroducir panel Terminal / PTY / `EmbeddedTerminal`.
- Inventar backend de agente, auth, o persistencia.
- Sustituir OpenTUI por Ink/Blessed u otra TUI.
- Commits o push sin petición explícita.

## UX que debe preservarse

- Tab: Plan ↔ Build; modo en cada mensaje echo.
- `/`: menú filtrable scrollable (8 visibles).
- Prompt: altura dinámica, máx. 25% del terminal, track de scroll si hace falta.
- Atajos y comandos: no los redefinas en componentes. Edita el registro y mira [docs/shortcuts.md](docs/shortcuts.md) y [docs/commands.md](docs/commands.md).
