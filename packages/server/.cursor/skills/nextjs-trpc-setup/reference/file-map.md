# File map (asset → destination)

All paths relative to skill `assets/` and target project root.

| Asset | Destination |
|-------|-------------|
| `trpc/client.tsx` | `src/trpc/client.tsx` |
| `trpc/init.ts` | `src/trpc/init.ts` |
| `trpc/server.tsx` | `src/trpc/server.tsx` |
| `trpc/query-client.ts` | `src/trpc/query-client.ts` |
| `trpc/routers/_app.ts` | `src/trpc/routers/_app.ts` |
| `app/api/trpc/[trpc]/route.ts` | `src/app/api/trpc/[trpc]/route.ts` |
| `layout-provider.snippet.tsx` | Reference only (not copied; `patch-layout.sh` applies equivalent) |

Install via `scripts/install-files.sh --root <ROOT>` (or `main.sh`).
