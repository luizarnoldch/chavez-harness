# Slash commands

> Generado por `bun run docs:registry` en `packages/cli`. No edites la tabla a mano.
> Fuente: `packages/cli/src/registry/commands.ts`.

El menú y el submit leen `COMMANDS`. No copies esta tabla en otros documentos.

| Comando | Qué hace | Nombre |
|---------|----------|--------|
| `/new` | Nueva conversación | `new` |
| `/exit` | Salir de la aplicación | `exit` |
| `/models` | Elige el modelo del chat | `models` |
| `/logout` | Cerrar sesión | `logout` |

## Cómo añadir un comando

1. Si hace falta una capacidad nueva, amplía `CommandContext` en [`packages/cli/src/types/commands.tsx`](../packages/cli/src/types/commands.tsx).
2. Añade una entrada en [`packages/cli/src/registry/commands.ts`](../packages/cli/src/registry/commands.ts) con `name`, `description` (español), `value` y `action`.
3. Regenera esta página: `cd packages/cli && bun run docs:registry`.
4. No toques el menú: se lista y filtra solo.

Dentro de `action`, avisa con `ctx.toast("...", "success" | "info" | "error")`. El texto y el tipo los decide el comando.
Dentro de `action`, abre un diálogo con `ctx.dialog.open("id")` y ciérralo con `ctx.dialog.close()`.

El filtro está en [`getFilterCommands`](../packages/cli/src/constants/filter-commands.tsx) (nombre o descripción, sin distinguir mayúsculas).

## Resolución al enviar

En `Prompt`, al submit:

1. Match exacto por `value` o `/${name}`.
2. Si no, el ítem filtrado en `selectedCommandIndex`.
3. Si es comando con `action`, se ejecuta y no se hace echo.
4. Texto que empieza por `/` sin match no se envía como mensaje.
5. Cualquier otro texto se envía como echo con el modo actual.
