# CLI UX

Comportamiento implementado hasta ahora en `@chavez-harness/cli`.

## Modos Plan / Build

- **Tab** alterna entre `plan` y `build`.
- Chips en la status bar:
  - Plan activo: `#e0af68` (amarillo)
  - Build activo: `#9ece6a` (verde)
  - Inactivo: fondo `#2a2e3f`, texto dim
- Cada mensaje echo guarda el `mode` vigente y se muestra como `[plan]` / `[build]`.

Paleta de chrome alineada a Tokyo Night: `#1f2335`, `#414868`, `#7aa2f7`.

## Slash commands

Catálogo y cómo registrar uno: [commands.md](./commands.md). El menú muestra como máximo 8 ítems; el resto scrollea.

## Prompt

- Altura dinámica según `lineCount`, tope **25%** de la altura del terminal (`useTerminalDimensions`).
- Si el contenido supera el viewport: scroll interno del `textarea` + track de 1 columna (`#414868` / thumb `#7aa2f7`).
- Enter envía (echo o comando); Shift+Enter nueva línea. Detalle de teclas: [shortcuts.md](./shortcuts.md).

## Atajos

La lista completa (qué hace cada uno) está en [shortcuts.md](./shortcuts.md). No la dupliques aquí.

## Fuera de alcance actual

- Panel Terminal / PTY / `EmbeddedTerminal`
- Backend de agente, streaming LLM, persistencia de sesiones
