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

Install better-auth email/password UI and tRPC wiring at `{{TARGET}}` after foundation validate PASS — `features/auth`, `(auth)` sign-in/sign-up pages, dashboard stub, `src/proxy.ts`, `protectedProcedure`, and `authRouter` mount — using only `nextjs-better-auth-frontend`.

## Problem Statement

Frontend auth must go through tRPC → `auth.api`, not ad-hoc `authClient` form wiring. Without the canonical capture, agents invent `middleware.ts`, hand-write `protectedProcedure`, or re-validate tRPC foundation after intentional init/_app patches.

## Goals

- [ ] Confirm better-auth foundation validate PASS and tRPC API route exist
- [ ] Install and validate auth UI + proxy + protectedProcedure using only `nextjs-better-auth-frontend`
- [ ] Keep forms on tRPC mutations (no `better-auth/react` client in forms)

## Non-Goals

- Re-running `nextjs-better-auth-setup` or adding `BETTER_AUTH_*` keys
- OAuth / social UI
- Re-running `nextjs-trpc-setup` validate after patches (init/_app diverge by design)
- Hand-writing `features/auth` or `proxy.ts` from docs

## User Stories

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-01 | developer / agent | run `nextjs-better-auth-frontend` after foundation PASS | sign-in/sign-up pages and session guards match project assets |
| US-02 | developer / agent | get `protectedProcedure` and `authRouter` from skill patches | protected tRPC procedures and auth mutations work without hand-rolled init |
| US-03 | developer / agent | avoid re-validating tRPC foundation after patches | intentional auth divergence from tRPC assets is preserved |

## Acceptance Criteria

| ID | Story | Criterion |
|---|---|---|
| AC-01 | US-01 | When the skill completes, `bash nextjs-better-auth-frontend/scripts/validate.sh --root {{TARGET}}` exits PASS (`src/features/auth/`, `src/app/(auth)/sign-in`, `sign-up`, `src/app/dashboard`, `src/proxy.ts`) |
| AC-02 | US-02 | When patches complete, `src/trpc/init.ts` exports `protectedProcedure` and `src/trpc/routers/_app.ts` mounts `auth: authRouter` |
| AC-03 | US-03 | Auth forms use tRPC mutations (not `authClient` / `better-auth/react` in form components); `nextjs-trpc-setup` validate is **not** re-run |

## Setup Guide

Execute **in order**. Do not skip ahead.

### Prerequisites (guide-only)

Confirm before running the CLI:

1. **nextjs-better-auth-setup** validate PASS (`src/lib/auth`, `api/auth`, schema, `config.betterAuthSecret` / `betterAuthUrl`)
2. **nextjs-trpc-setup** — route at `src/app/api/trpc/[trpc]/route.ts`
3. Prefer shadcn form primitives already present (Card/Field/Button) for captured forms

Do **not** start the frontend CLI until foundation validate PASS.

### Step 1 — better-auth frontend (`nextjs-better-auth-frontend`)

Load the `nextjs-better-auth-frontend` skill. Do **not** hand-write auth forms or `protectedProcedure`. Run:

```bash
AUTH_FE_SKILL="<repo>/.cursor/skills/nextjs-better-auth-frontend"
bash "$AUTH_FE_SKILL/scripts/main.sh" --root "{{TARGET}}"
bash "$AUTH_FE_SKILL/scripts/validate.sh" --root "{{TARGET}}"
```

Re-run validate until PASS. Leave frontend auth skill assets unchanged.

**Do not** re-run `nextjs-trpc-setup/scripts/validate.sh` after this step — `init.ts` / `_app.ts` intentionally diverge from tRPC foundation assets.

## Technical Context

- **Entity**: `{{ENTITY}}` (setup sentinel; not a domain model)
- **Target**: `{{TARGET}}`
- **Stack**: better-auth UI via tRPC, App Router `(auth)` routes, `src/proxy.ts` session guards
- **Automated skill (Execution)**: `{{SKILL_NAME}}`
- **Guide-only prereqs**: `nextjs-better-auth-setup`, `nextjs-trpc-setup`

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

- Foundation auth / env key installation
- OAuth or social providers
- Changing better-auth-frontend or tRPC skill assets
- Generic entity frontend scaffolds

## Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | None for canonical better-auth frontend | — | closed |
