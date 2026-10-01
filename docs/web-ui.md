# Web UI (`packages/web`)

Astro + React + shadcn (Tailwind v4). Port del mock vanilla de **paperclip-clone** (`css/*.css`, `js/views/*.js`) reescrito como islas React; solo usa el REST / WS que ya expone `packages/server`.

## Rutas

| Ruta | Pantalla | Datos |
|------|----------|-------|
| `/login`, `/register` | Tarjeta centrada + toggle de tema | better-auth |
| `/workspaces` | Secciones «En vivo» (daemon online) y «Otros», banner «PC offline», Activar / Desactivar | `GET /api/workspaces`, `/api/machine`, `/connections` |
| `/workspaces/[id]` | Presencia del workspace, filtros Todas / Plan / Build, FAB y sheet «Nueva sesión» (modo + modelo) | REST + WS compartido |
| `/sessions/[id]` | Chat: cabecera, transcript (razonamiento, tool calls con diff, uso), progreso en vivo, composer Plan/Build + modelo | REST + WS compartido |
| `/arsenal/providers` | Estado de credenciales y sheet «Conectar» (solo `cursor` es conectable) | `GET /api/providers`, `PUT /api/providers/:provider/credentials` |
| `/projects`, `/brain`, `/arsenal`, `/arsenal/{agents,skills,workflows,sync}` | **Próximamente** (`ComingSoon`); `/arsenal` además enlaza a sus secciones | — |

No hay alta de workspaces desde la web: el server los crea cuando el TUI hace `workspace.bind` en una carpeta.

## Shell

- `components/shell/AppShell.tsx`: rail en escritorio (≥ 900 px, variante Tailwind `desk:`), tab bar abajo en móvil, `AppBar` por vista (título, subtítulo, `backHref`, acciones). También es el guard de sesión (redirige a `/login?next=…` y llama a `ensureSessionToken()`).
- `immersive` oculta la tab bar en móvil (el chat se queda con el borde inferior); `fill` desactiva el scroll del `main` para vistas con scroll propio.
- Navegación en `components/shell/nav-items.ts`; los ítems sin backend llevan `soon: true` (badge «Pronto» en el rail).

## Tema

- Tokens «paper + wire» del mock en `src/styles/global.css`: claro en `:root`, oscuro en `.dark`, mapeados a las variables shadcn (`--background`, `--card`, `--primary`, …) más colores propios: `agent`, `stage-plan` / `stage-build`, `status-*`, `diff-add` / `diff-del`, `faint`, `primary-soft`.
- Fuentes self-hosted en `public/fonts/`: Archivo (display), IBM Plex Sans (cuerpo), IBM Plex Mono (código).
- `Layout.astro` lleva un script inline anti-flash: `localStorage["harness:theme"]` (`light` | `dark`) o, si no hay elección, `prefers-color-scheme`. `src/lib/theme.ts` (`useResolvedTheme`, `toggleTheme`) observa la clase de `<html>`, así el `Toaster` y el resaltado de código siguen el tema.

## Un solo WebSocket por página

`src/lib/ws/shared-socket.ts` + `useChavezSocket.ts`: un `ChavezWsClient` por workspace y página, con contador de referencias. En cada apertura hace `workspace.bind` → `workspace.sync` y reparte los pushes por `type` (`useSocketPush`). `useWorkspacePresence` y el chat comparten esa instancia; el badge **En vivo / Conectando… / Sin sync** sale de su estado (ver [ops-realtime-sync.md](./ops-realtime-sync.md)).

## Chat

- `features/chat/state/useChatSession.ts`: historial REST, envío optimista por `chat.send` (con `mode`, `provider`, `model`), pushes `session.message.created` / `session.updated` y recuperación de mensajes tras reconectar.
- `features/chat/live/generate-stream.ts`: acumula `chat.generate.progress` (texto en `streaming`, tool calls por id como `upsertDraftTool` del CLI).
- `features/chat/transcript/tool-summary.ts`: resumen de tool calls y parser de diff unificado, con las mismas heurísticas que `ToolCallRow.tsx` del CLI.
- Sin botón «Stop»: el server no permite cancelar una generación. Si la sesión usa Cursor y no hay credencial, el composer avisa con enlace a `/arsenal/providers`.

## Desarrollo

```bash
bun run dev:web                    # astro dev en :4321 (proxy /api y /ws → API_INTERNAL_URL)
cd packages/web && bun test src    # tests (solo en carpetas tests/)
cd packages/web && bun run build
```

`bun run typecheck` (`astro check`) no funciona con el TypeScript 7 nativo instalado (el language server de Astro aún no soporta su API).
