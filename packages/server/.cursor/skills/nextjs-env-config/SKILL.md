---
name: nextjs-env-config
description: >-
  Use when adding a new environment variable, editing src/lib/config.ts, syncing
  .env / .env.example, wiring NEXT_PUBLIC_APP_URL into src/trpc/client.tsx, or
  when a nextjs-init Setup Guide reaches the env-config step after tRPC validate.
  Also use when an agent is about to read process.env outside config.ts or rewrite
  existing .env values.
---

# Next.js env config

CLI + `assets/` are the source of truth for `src/lib/config.ts` bootstrap and append-only env sync. Consume env only through `config` — never scatter `process.env` in app code.

**Violating the letter of the rules is violating the spirit of the rules.**

## Iron law

```
NEW ENV VARS GO THROUGH config.ts + append-only sync — NEVER REWRITE EXISTING .env VALUES
```

**No exceptions:**
- Do not put `process.env.*` in `src/trpc/client.tsx` (or elsewhere) after wire — use `config`
- Do not edit existing keys in `.env` (values may be secrets / machine-local)
- Do not change `nextjs-trpc-setup` assets or re-run its `validate.sh` after wire
- Do not invent a different Zod config layout — extend the existing `envSchema` + `config` object

## Path resolution

Scripts live in this skill folder. Never invoke a bare `scripts/bootstrap.sh`.

1. Repo root: `git rev-parse --show-toplevel`. If that fails, walk upward until `.cursor/skills/nextjs-env-config/SKILL.md` exists.
2. Skill dir: `<repo-root>/.cursor/skills/nextjs-env-config`
3. `--root` is the **absolute** Next.js project root (directory containing `src/`).

## When to use

| Situation | Command |
|-----------|---------|
| After `nextjs-trpc-setup` validate PASS (nextjs-init Step 4) | `bootstrap.sh --root "$ROOT"` |
| Add any new env var | Edit schema via `add-env-var.sh` (or extend `config.ts` then `sync-env-key.sh`) |
| `DATABASE_URL` (before/with drizzle) | Invoked from **nextjs-drizzle-setup** / db-setup PRD via `add-env-var.sh` |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` (with better-auth) | Invoked from **nextjs-better-auth-setup** `sync-env.sh` → `add-env-var.sh` |
| Only sync one key into env files | `sync-env-key.sh --root "$ROOT" --key KEY --value ...` |
| Client still on VERCEL_URL / localhost / raw `NEXT_PUBLIC_APP_URL` | `wire-trpc-client.sh --root "$ROOT"` |

Bootstrap asset `config.ts` stays **minimal** (`NODE_ENV`, `NEXT_PUBLIC_APP_URL` only). Do **not** put `DATABASE_URL` or `BETTER_AUTH_*` in bootstrap assets — those are added later with `add-env-var.sh`.

## Quick start — bootstrap (Step 4)

Run **only after** `nextjs-trpc-setup` `validate.sh` exits PASS. Then:

```bash
SKILL="<repo-root>/.cursor/skills/nextjs-env-config"
ROOT="<absolute-target-project-root>"

bash "$SKILL/scripts/bootstrap.sh" --root "$ROOT"
```

What bootstrap does (in order):

1. `ensure-gitignore-env.sh` — `.env*` + `!*.example`
2. Install `assets/config.ts` → `src/lib/config.ts` if missing
3. Append-only sync of base keys from `assets/env.example` into `.env.example` and `.env`
4. `wire-trpc-client.sh` — `getUrl()` uses `config.nextPublicAppUrl`

**Do not re-run** `nextjs-trpc-setup/scripts/validate.sh` after bootstrap — byte-cmp against trpc assets will fail by design.

## Quick start — add a variable

```bash
bash "$SKILL/scripts/add-env-var.sh" --root "$ROOT" \
  --key MY_API_URL \
  --value "http://localhost:8080" \
  --zod 'z.string().optional().default("http://localhost:8080")'
```

Or: edit `src/lib/config.ts` (add to `envSchema` + `config`), then:

```bash
bash "$SKILL/scripts/sync-env-key.sh" --root "$ROOT" \
  --key MY_API_URL --value "http://localhost:8080"
```

## Workflow checklist

```
Progress:
- [ ] 1. Resolve SKILL + ROOT (absolute)
- [ ] 2. If post-tRPC init: confirm nextjs-trpc-setup validate already PASS
- [ ] 3. bootstrap.sh OR add-env-var.sh / sync-env-key.sh as needed
- [ ] 4. Confirm client uses config.nextPublicAppUrl (wire if not)
- [ ] 5. Do NOT re-run nextjs-trpc-setup validate
```

## Canonical files

```
src/lib/config.ts          # Zod envSchema + exported config
.env.example               # committed documentation of keys
.env                       # local only; append new keys; never rewrite
src/trpc/client.tsx        # getUrl → config.nextPublicAppUrl (after wire)
.gitignore                 # .env* + !*.example
```

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'll just set process.env in client — faster" | Forbidden. Wire via `wire-trpc-client.sh` / bootstrap. |
| "I need to update an old .env value" | Out of scope for this skill. Append-only for **new** keys only. |
| "Re-validate tRPC after wire to be safe" | Validate will FAIL; that is expected. Do not re-run. |
| "I'll change nextjs-trpc-setup assets to use config" | Forbidden. tRPC setup stays canonical; migration is this skill. |
| "config.ts already exists with a typo — leave it" | Bootstrap without `--force-config` leaves it; for broken schema, fix keys via add-env-var or `--force-config` when intentional. |
| ".env.example is gitignored — skip it" | `!*.example` must be present; run `ensure-gitignore-env.sh`. |

## Red flags — STOP

- Reading or rewriting existing `.env` values
- Adding `process.env.VERCEL_URL` / `process.env.NEXT_PUBLIC_*` outside `config.ts`
- Editing `nextjs-trpc-setup` assets to depend on `config`
- Re-running tRPC `validate.sh` after wire and "fixing" client back to assets
- Duplicating keys by pasting into `.env` without checking presence (use `sync-env-key.sh`)

**All of these mean: stop, use the scripts above, append-only sync only.**

## Related skills

- **nextjs-trpc-setup** — run and validate **before** bootstrap; leave assets intact; do not re-validate after wire
- **nextjs-drizzle-setup** — expects `config.databaseUrl` via this skill's `add-env-var.sh`
- **nextjs-better-auth-setup** — expects `betterAuthSecret` / `betterAuthUrl` via this skill's `add-env-var.sh` (its `sync-env.sh`)
- **prd-authoring** (`nextjs-init`) — Step 4 guide-only invokes this skill after Step 3
