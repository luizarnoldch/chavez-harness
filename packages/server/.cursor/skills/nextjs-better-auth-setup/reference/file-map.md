# File map (asset → destination)

All paths relative to skill `assets/` and target project root.

| Asset | Destination |
|-------|-------------|
| `lib/auth/index.ts` | `src/lib/auth/index.ts` |
| `lib/auth/email-password/email.ts` | `src/lib/auth/email-password/email.ts` |
| `lib/auth/email-password/password.ts` | `src/lib/auth/email-password/password.ts` |
| `lib/auth/email-password/verification.ts` | `src/lib/auth/email-password/verification.ts` |
| `lib/auth/hooks/createMiddleware.ts` | `src/lib/auth/hooks/createMiddleware.ts` |
| `lib/auth-client.ts` | `src/lib/auth-client.ts` |
| `app/api/auth/[...all]/route.ts` | `src/app/api/auth/[...all]/route.ts` |
| `db/auth/auth-schema.ts` | `src/db/auth/auth-schema.ts` |

Install via `scripts/install-files.sh --root <ROOT>` (or `main.sh`).

## Patched (not assets)

| Target | Script |
|--------|--------|
| `src/lib/db.ts` | `patch-db.sh` — `authRelations` + `export default db` |
| `src/db/schema.ts` | `patch-schema.sh` — `export * from "./auth/auth-schema"` |
| `package.json` | `patch-package-scripts.sh` — `auth:generate` + `"type": "module"` |
| `.env` / `.env.example` + `src/lib/config.ts` | `sync-env.sh` → nextjs-env-config **`add-env-var.sh`** |

## package.json scripts (patched)

| Script | Command |
|--------|---------|
| `auth:generate` | `bunx auth@latest generate --config ./src/lib/auth/index.ts --output ./src/db/auth/auth-schema.ts -y` |

## Prerequisites

- **nextjs-drizzle-setup**: `src/lib/db.ts` exists (pg + drizzle)
- **nextjs-env-config**: `src/lib/config.ts` exports `nextPublicAppUrl`
