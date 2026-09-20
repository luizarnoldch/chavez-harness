---
name: nextjs-drizzle-setup
description: >-
  Bootstraps Drizzle ORM (RC) + pg + drizzle-kit in a Next.js App Router app —
  installs deps, src/lib/db.ts, drizzle.config.ts, empty schema, seed/reset
  stubs, package.json db scripts, and runs drizzle-kit generate. Use when the
  user says set up Drizzle, drizzle-kit, DATABASE_URL client, migrations
  generate, src/db/schema.ts, or when an agent is about to invent db.ts /
  drizzle.config from memory.
---

# Next.js Drizzle foundation setup

CLI + `assets/` are the **only** source of truth. Do not invent Drizzle client
or kit config from general knowledge.

**Violating the letter of the rules is violating the spirit of the rules.**

## Iron law

```
NO HAND-WRITTEN src/lib/db.ts OR drizzle.config.ts — RUN THE CLI
```

Write files from memory? Delete them. Run `scripts/main.sh`. Start over.

**No exceptions:**
- Do not paste Drizzle docs over assets
- Do not swap `node-postgres` for another driver without changing assets first
- Do not invent a different `bun add` set — use `install-deps.sh` / `main.sh`
- Do not rewrite existing `.env` values (use **nextjs-env-config** for `DATABASE_URL`)
- Do not use the typo path `src/db/scritps` — canonical is `src/db/scripts`

## Path resolution

Scripts live in this skill folder. Never invoke a bare `scripts/main.sh`.

1. Repo root: `git rev-parse --show-toplevel`. If that fails, walk upward until `.cursor/skills/nextjs-drizzle-setup/SKILL.md` exists.
2. Skill dir: `<repo-root>/.cursor/skills/nextjs-drizzle-setup`
3. `--root` is the **absolute** Next.js project root (directory containing `src/`).

## Quick start

```bash
SKILL="<repo-root>/.cursor/skills/nextjs-drizzle-setup"
ROOT="<absolute-target-project-root>"

bash "$SKILL/scripts/main.sh" --root "$ROOT"
bash "$SKILL/scripts/validate.sh" --root "$ROOT"
```

Flags: `--force` (overwrite files), `--force-install` (full bun add), `--skip-deps`, `--files-only`, `--skip-generate`.

Order: **deps → files → package scripts → generate → validate**.

**Post–better-auth:** `src/lib/db.ts` and `src/db/schema.ts` are patched by **nextjs-better-auth-setup**. Re-running this skill's `validate.sh` still PASS if those files are either byte-identical to assets **or** the known auth patches (`authRelations` / `export * from "./auth/auth-schema"`). Do not hand-revert those patches to force a bare cmp.

## Workflow checklist

```
Progress:
- [ ] 1. Resolve SKILL + ROOT (absolute)
- [ ] 2. bash scripts/main.sh --root "$ROOT" [--force / --force-install as needed]
- [ ] 3. bash scripts/validate.sh --root "$ROOT" (must PASS — includes deps + config.databaseUrl)
- [ ] 4. If install-deps fails: fix bun/network, re-run — do not invent a different package list
```

## What gets installed

See `reference/file-map.md`, `reference/deps.md`.

Canonical tree:

```
src/lib/db.ts
drizzle.config.ts
src/db/schema.ts
src/db/scripts/seed.ts
src/db/scripts/reset.ts
drizzle/                 # from drizzle-kit generate (may be empty schema → no SQL)
package.json             # db:seed, db:reset
```

Canonical install sequence (encoded in scripts):

1. `bun add drizzle-orm@rc pg dotenv`
2. `bun add -D drizzle-kit@rc tsx @types/pg`
3. Copy assets (db client, kit config, schema, seed/reset)
4. Patch `db:seed` / `db:reset` scripts
5. `bunx drizzle-kit generate`

## Prerequisite: config.databaseUrl

`drizzle.config.ts` imports `config.databaseUrl` from `@/lib/config`.
`validate.sh` fails if `databaseUrl` is missing from `src/lib/config.ts`.
Add `DATABASE_URL` via **nextjs-env-config** — never rewrite existing `.env` keys.

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "I know Drizzle; faster to write from scratch" | Assets encode this project's exact RC + pg stack. |
| "Use postgres.js / neon instead of pg" | **Forbidden** until assets change. validate expects `pg`. |
| "Skip generate — schema is empty anyway" | Still run `generate.sh` unless `--skip-generate`. |
| "I'll add packages with npm / different versions" | `install-deps.sh` is the source of truth. |
| "Fix the typo and keep scritps/" | Canonical path is `src/db/scripts`. |

## Red flags — STOP

- Hand-writing `src/lib/db.ts` or `drizzle.config.ts`
- Creating `src/db/scritps/`
- Skipping `validate.sh`
- Reading `process.env` for new app env keys outside the captured `db.ts` pattern without updating **nextjs-env-config**
- Claiming "spirit of working Drizzle" while changing drivers or kit paths

**All of these mean: delete hand-written changes, run `main.sh`, re-validate.**

## Related skills

- **nextjs-env-config** — `DATABASE_URL` / `config.databaseUrl` (add via `add-env-var.sh` before or with this skill)
- **docker-compose** — local Postgres
- **nextjs-better-auth-setup** — patches `db.ts` (`authRelations`) and `schema.ts` re-export; drizzle validate accepts either bare or patched forms
- **nextjs-better-auth-frontend** — auth UI / tRPC auth (after better-auth foundation)
- Feature CRUD layers: **nextjs-backend-scaffolding** (after this foundation exists)
