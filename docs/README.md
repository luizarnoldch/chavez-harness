# Chavez Harness

Harness TUI (terminal UI) para conversaciones con modos **Plan** y **Build**. Hoy el núcleo vivo es el paquete CLI basado en **Bun + React + OpenTUI**.

## Arranque rápido

Desde la raíz del monorepo:

```bash
bun install
bun run dev:cli
```

Typecheck del CLI:

```bash
cd packages/cli && bun run typecheck
```

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [architecture.md](./architecture.md) | Monorepo, stack, layout y flujo de estado |
| [cli-ux.md](./cli-ux.md) | Comportamiento de UI |
| [shortcuts.md](./shortcuts.md) | Atajos de teclado (generado) |
| [commands.md](./commands.md) | Slash commands (generado) |

Contexto para agentes de IA: [AGENTS.md](../AGENTS.md) en la raíz del repo.
