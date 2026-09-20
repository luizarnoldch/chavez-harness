---
name: nextjs-better-auth-setup
description: >-
  Bootstraps better-auth (email/password) with the Drizzle adapter in a Next.js
  App Router app — installs better-auth, src/lib/auth/*, auth-client, API route
  handler, auth-schema, wires db relations, auth:generate script, and
  BETTER_AUTH_* env keys via nextjs-env-config. Use when the user says set up
  better-auth, drizzle auth adapter, auth:generate, src/lib/auth, email/password
  auth, or when an agent is about to invent better-auth config from memory.
---

# Next.js better-auth foundation setup

CLI + `assets/` are the **only** source of truth. Do not invent better-auth
files from general knowledge or official docs.

**Violating the letter of the rules is violating the spirit of the rules.**

## Iron law

```
NO HAND-WRITTEN src/lib/auth/* OR auth-schema — RUN THE CLI
```

Write files from memory? Delete them. Run `scripts/main.sh`. Start over.

**No exceptions:**
- Do not paste better-auth docs over assets
- Do not swap Drizzle adapter for another adapter without changing assets first
- Do not invent a different `bun add` set — use `install-deps.sh` / `main.sh`
- Do not rewrite existing `.env` values (use **nextjs-env-config** via `sync-env.sh` → `add-env-var.sh`)
- Do not add OAuth / social / organization plugins in this skill
- Do not replace Lucia, NextAuth, Clerk, or Auth.js — this skill is better-auth only
- Do not add sign-in/sign-up UI, `src/proxy.ts`, or tRPC `protectedProcedure` — that is **nextjs-better-auth-frontend**

## Path resolution

Scripts live in this skill folder. Never invoke a bare `scripts/main.sh`.

1. Repo root: `git rev-parse --show-toplevel`. If that fails, walk upward until `.cursor/skills/nextjs-better-auth-setup/SKILL.md` exists.
2. Skill dir: `<repo-root>/.cursor/skills/nextjs-better-auth-setup`
3. `--root` is the **absolute** Next.js project root (directory containing `src/`).

## Prerequisites

1. **nextjs-drizzle-setup** applied (`src/lib/db.ts` with pg pool)
2. **nextjs-env-config** applied (`src/lib/config.ts` with `nextPublicAppUrl`)
3. Sibling skill **nextjs-env-config** present for `sync-env.sh` / `add-env-var.sh`

## Quick start

```bash
SKILL="<repo-root>/.cursor/skills/nextjs-better-auth-setup"
ROOT="<absolute-target-project-root>"

bash "$SKILL/scripts/main.sh" --root "$ROOT"
bash "$SKILL/scripts/validate.sh" --root "$ROOT"
```

Flags: `--force` (overwrite files), `--force-install` (full bun add), `--skip-deps`, `--files-only`, `--skip-generate` (default), `--force-generate` (regenerate schema; may diverge from assets).

Order: **deps → files → patch db → patch schema → package scripts → sync env (add-env-var) → [optional generate] → validate**.

## Workflow checklist

```
Progress:
- [ ] 1. Resolve SKILL + ROOT (absolute); confirm drizzle + config exist
- [ ] 2. bash scripts/main.sh --root "$ROOT" [--force / --force-install as needed]
- [ ] 3. bash scripts/validate.sh --root "$ROOT" (must PASS)
- [ ] 4. If install-deps fails: fix bun/network, re-run — do not invent a different package list
- [ ] 5. (Manual) Set a real BETTER_AUTH_SECRET in .env; run drizzle-kit generate/migrate if schema is new
- [ ] 6. Next: nextjs-better-auth-frontend for UI, proxy, protectedProcedure
```

## What gets installed

See `reference/file-map.md`, `reference/deps.md`, `reference/env.md`.

Canonical tree:

```
src/lib/auth/
  index.ts
  email-password/{email,password,verification}.ts
  hooks/createMiddleware.ts
src/lib/auth-client.ts
src/app/api/auth/[...all]/route.ts
src/db/auth/auth-schema.ts
src/lib/db.ts              # patched: authRelations + export default db
src/db/schema.ts           # patched: export * from "./auth/auth-schema"
package.json               # better-auth, type=module, auth:generate
src/lib/config.ts          # betterAuthSecret + betterAuthUrl (via add-env-var)
.env.example               # BETTER_AUTH_SECRET, BETTER_AUTH_URL
```

Canonical install sequence (encoded in scripts):

1. `bun add better-auth`
2. Copy auth assets (config, client, route, schema snapshot)
3. Patch `db.ts` / `schema.ts` / package scripts / env via **add-env-var**
4. Validate against assets (schema generate skipped by default)

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "I know better-auth; faster to write from scratch" | Assets encode this project's email/password + drizzle + uuid stack. |
| "Use Prisma adapter / SQLite instead" | **Forbidden** until assets change. validate expects drizzle pg capture. |
| "Add Google OAuth while I'm here" | Out of scope. This skill is email/password only. |
| "Skip validate — files look fine" | validate is mandatory. |
| "auth generate every time by default" | Canonical schema is the asset. Use `--force-generate` only when intentionally regenerating. |
| "I'll rewrite .env secrets" | Append-only via nextjs-env-config. Never rewrite existing keys. |
| "I'll only sync .env keys, skip config.ts" | `sync-env.sh` must use `add-env-var.sh` so Zod + config exports exist. |
| "I'll add sign-in pages now" | Out of scope — use **nextjs-better-auth-frontend**. |

## Red flags — STOP

- Hand-writing `src/lib/auth/*` or inventing a different route path
- Skipping `validate.sh`
- Adding social providers or replacing the drizzle adapter from memory
- Claiming "spirit of working auth" while changing the capture
- Running `--force-generate` then "fixing" schema by hand without re-capturing the asset
- Adding UI / proxy / tRPC auth patches in this skill

**All of these mean: delete hand-written changes, run `main.sh`, re-validate.**

## Related skills

- **nextjs-drizzle-setup** — must exist before this skill
- **nextjs-env-config** — `BETTER_AUTH_*` via `add-env-var` + `nextPublicAppUrl`
- **nextjs-better-auth-frontend** — sign-in/sign-up UI, `protectedProcedure`, `proxy.ts` (run after this validate PASS)
- Post-setup (manual): `drizzle-kit generate` / migrate for new auth tables
