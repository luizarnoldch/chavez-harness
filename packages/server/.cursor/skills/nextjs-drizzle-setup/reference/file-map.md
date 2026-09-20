# File map (asset → destination)

All paths relative to skill `assets/` and target project root.

| Asset | Destination |
|-------|-------------|
| `lib/db.ts` | `src/lib/db.ts` |
| `drizzle.config.ts` | `drizzle.config.ts` |
| `db/schema.ts` | `src/db/schema.ts` |
| `db/scripts/seed.ts` | `src/db/scripts/seed.ts` |
| `db/scripts/reset.ts` | `src/db/scripts/reset.ts` |

Install via `scripts/install-files.sh --root <ROOT>` (or `main.sh`).

## package.json scripts (patched, not assets)

| Script | Command |
|--------|---------|
| `db:seed` | `bun run ./src/db/scripts/seed.ts` |
| `db:reset` | `bun run ./src/db/scripts/reset.ts` |

## Prerequisite

`src/lib/config.ts` must export `databaseUrl` (from `DATABASE_URL`). If missing, use **nextjs-env-config** — do not rewrite existing `.env` values.
