---
kind: {{KIND}}
type: {{TYPE}}
id: {{ID}}
status: draft
created: {{DATE}}
entity: {{ENTITY}}
{{FEATURE_ID_LINE}}---

# PRD: {{TITLE}}

## Overview

Bootstrap better-auth (email/password) with the Drizzle adapter at `{{TARGET}}` — `src/lib/auth/*`, auth API route, auth-schema, `BETTER_AUTH_*` via `nextjs-env-config` — using only `nextjs-better-auth-setup` until validate PASS.

## Problem Statement

Auth scaffolding assumes a typed Drizzle client, `config.nextPublicAppUrl`, and a canonical better-auth layout. Without an ordered foundation setup, agents invent adapters, hand-write `src/lib/auth/*`, rewrite `.env` secrets, or add UI/proxy before the foundation validates.

## Goals

- [ ] Confirm Drizzle foundation and env config prerequisites (`src/lib/db.ts`, `config.nextPublicAppUrl`)
- [ ] Install and validate better-auth foundation using only `nextjs-better-auth-setup` (CLI + validate)
- [ ] Leave sign-in UI, `proxy.ts`, and `protectedProcedure` to the frontend auth PRD

## Non-Goals

- Sign-in / sign-up pages, dashboard stub, or `src/proxy.ts`
- tRPC `protectedProcedure` or `authRouter` mount — use `nextjs-better-auth-frontend`
- OAuth / social / organization plugins
- Rewriting existing `.env` values
- Hand-writing auth assets from better-auth docs

## User Stories

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-01 | developer / agent | run `nextjs-better-auth-setup` after Drizzle + config exist | auth server, client, schema, and env keys match project assets |
| US-02 | developer / agent | rely on skill `sync-env` → `add-env-var` for `BETTER_AUTH_*` | `config.betterAuthSecret` / `betterAuthUrl` stay typed and append-only |
| US-03 | developer / agent | stop after foundation validate PASS | the frontend auth PRD can run without inventing foundation files |

## Acceptance Criteria

| ID | Story | Criterion |
|---|---|---|
| AC-01 | US-01 | When the skill completes, `bash nextjs-better-auth-setup/scripts/validate.sh --root {{TARGET}}` exits PASS (`src/lib/auth/`, `src/lib/auth-client.ts`, `src/app/api/auth/[...all]/route.ts`, `src/db/auth/auth-schema.ts`, deps, `auth:generate`) |
| AC-02 | US-02 | When env sync completes, `.env.example` documents `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`, and `src/lib/config.ts` exports `betterAuthSecret` / `betterAuthUrl` (no rewrite of existing `.env` keys) |
| AC-03 | US-03 | No sign-in/sign-up UI, `src/proxy.ts`, or `protectedProcedure` are added by this PRD |

## Setup Guide

Execute **in order**. Do not skip ahead. The automated skill in `## Execution` is the only step that installs files.

### Prerequisites (guide-only)

Confirm before running the CLI:

1. **nextjs-drizzle-setup** applied — `src/lib/db.ts` with pg pool, `src/db/schema.ts`
2. **nextjs-env-config** applied — `src/lib/config.ts` exports `nextPublicAppUrl`
3. Sibling skill **nextjs-env-config** present for this skill's `sync-env.sh` / `add-env-var.sh`

Do **not** start the foundation CLI until those exist.

### Step 1 — better-auth foundation (`nextjs-better-auth-setup`)

Load the `nextjs-better-auth-setup` skill. Do **not** hand-write `src/lib/auth/*` or invent a different adapter. Run:

```bash
AUTH_SKILL="<repo>/.cursor/skills/nextjs-better-auth-setup"
bash "$AUTH_SKILL/scripts/main.sh" --root "{{TARGET}}"
bash "$AUTH_SKILL/scripts/validate.sh" --root "{{TARGET}}"
```

Re-run validate until PASS. Leave better-auth skill assets unchanged.

### Post-setup (manual)

- Set a real `BETTER_AUTH_SECRET` in `.env` (append-only / replace empty placeholder only; never invent rewrite tooling)
- Run `drizzle-kit generate` / migrate if auth tables are new
- Next PRD: `nextjs-better-auth-frontend` for UI, proxy, and `protectedProcedure`

## Technical Context

- **Entity**: `{{ENTITY}}` (setup sentinel; not a domain model)
- **Target**: `{{TARGET}}`
- **Stack**: better-auth email/password, Drizzle adapter, Zod config (`BETTER_AUTH_*`)
- **Automated skill (Execution)**: `{{SKILL_NAME}}`
- **Guide-only prereqs**: `nextjs-drizzle-setup`, `nextjs-env-config`
- **Follow-on**: `nextjs-better-auth-frontend`

## Execution

```yaml
kind: {{KIND}}
type: {{TYPE}}
target: {{TARGET}}
skills:
  - name: {{SKILL_NAME}}
    params:
```

## Out of Scope

- Frontend auth UI / proxy / protectedProcedure
- OAuth or social providers
- Changing better-auth or env-config skill assets
- Feature CRUD scaffolds unrelated to auth

## Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | None for canonical better-auth foundation | — | closed |
