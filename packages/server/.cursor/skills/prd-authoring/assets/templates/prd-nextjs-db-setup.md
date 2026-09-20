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

Provision local Postgres via `docker-compose` and bootstrap Drizzle ORM at `{{TARGET}}` — container prefix `{{PROJECT}}`, host port `{{POSTGRES_PORT}}` — with `DATABASE_URL` wired through `nextjs-env-config` before `nextjs-drizzle-setup` validate PASS.

## Problem Statement

Backend scaffolding with Drizzle assumes a running Postgres, a typed `config.databaseUrl`, and the canonical Drizzle client/kit layout. Without an ordered setup, agents invent compose stacks, rewrite `.env` values, or hand-write `db.ts` / `drizzle.config.ts` that diverge from project skills.

## Goals

- [ ] Stack and start Postgres with `docker-compose` (`--project={{PROJECT}}`, host port `{{POSTGRES_PORT}}`)
- [ ] Integrate `DATABASE_URL` into `src/lib/config.ts` via `nextjs-env-config` (append-only env sync)
- [ ] Install and validate the Drizzle foundation using only `nextjs-drizzle-setup` (CLI + validate)

## Non-Goals

- Scaffolding feature entities (schemas, routers, hooks, pages) — use backend/frontend scaffold PRDs after this
- MinIO or other compose services beyond Postgres
- Putting `docker-compose` or `nextjs-env-config` in `## Execution` (steps 1–2 are guide-only; Execution stays drizzle-only)
- Rewriting existing `.env` values

## User Stories

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-01 | developer / agent | run `docker-compose` for Postgres with a fixed project prefix and host port | the DB is reachable at `localhost:{{POSTGRES_PORT}}` without inventing compose YAML |
| US-02 | developer / agent | add `DATABASE_URL` through `nextjs-env-config` | `config.databaseUrl` is typed and env files stay append-only |
| US-03 | developer / agent | run `nextjs-drizzle-setup` after env is wired | Drizzle client, kit config, schema stubs, and package scripts match project assets |

## Acceptance Criteria

| ID | Story | Criterion |
|---|---|---|
| AC-01 | US-01 | When step 1 completes, `docker-compose.yml` has service `db`, container `{{PROJECT}}-db` is healthy, and host port `{{POSTGRES_PORT}}` maps to container `5432` |
| AC-02 | US-02 | When step 2 completes, `src/lib/config.ts` exports `databaseUrl`, and `DATABASE_URL` is present in `.env` / `.env.example` via `nextjs-env-config` (`add-env-var.sh` / `sync-env-key.sh`; no rewrite of existing keys) |
| AC-03 | US-03 | When step 3 completes, `bash nextjs-drizzle-setup/scripts/validate.sh --root {{TARGET}}` exits PASS (`src/lib/db.ts`, `drizzle.config.ts`, `src/db/schema.ts`, seed/reset scripts, deps, `db:seed` / `db:reset`) |

## Setup Guide

Execute **in order**. Do not skip ahead. Steps 1–2 are guide-only; step 3 is the only automated skill in `## Execution`.

### Step 1 — Postgres container (`docker-compose`)

Load the `docker-compose` skill. Pre-seed env keys **before** `stack.sh` so append-only sync does not lock in defaults (`POSTGRES_PORT=5432`, `DATABASE_URL=...@db:5432`). Use `nextjs-env-config` `sync-env-key.sh` (or append missing keys only):

```bash
ROOT="{{TARGET}}"
ENV_SKILL="<repo>/.cursor/skills/nextjs-env-config"
SYNC="$ENV_SKILL/scripts/sync-env-key.sh"
DB_URL="postgresql://postgres:postgres@localhost:{{POSTGRES_PORT}}/app"

bash "$SYNC" --root "$ROOT" --key POSTGRES_USER --value postgres
bash "$SYNC" --root "$ROOT" --key POSTGRES_PASSWORD --value postgres
bash "$SYNC" --root "$ROOT" --key POSTGRES_DB --value app
bash "$SYNC" --root "$ROOT" --key POSTGRES_PORT --value "{{POSTGRES_PORT}}"
bash "$SYNC" --root "$ROOT" --key DATABASE_URL --value "$DB_URL"
```

Then stack and start:

```bash
COMPOSE_SKILL="<repo>/.cursor/skills/docker-compose"
bash "$COMPOSE_SKILL/scripts/stack.sh" --root "$ROOT" --project {{PROJECT}} --services postgres
cd "$ROOT" && docker compose up -d
```

Confirm container `{{PROJECT}}-db` is healthy and listening on host port `{{POSTGRES_PORT}}`. Do **not** hand-write `docker-compose.yml` when fragments exist.

### Step 2 — Env config (`nextjs-env-config`)

Load the `nextjs-env-config` skill. Wire `DATABASE_URL` into Zod `config` (skip rewrite if the key already exists in `.env` from step 1):

```bash
ENV_SKILL="<repo>/.cursor/skills/nextjs-env-config"
bash "$ENV_SKILL/scripts/add-env-var.sh" --root "{{TARGET}}" \
  --key DATABASE_URL \
  --value "postgresql://postgres:postgres@localhost:{{POSTGRES_PORT}}/app" \
  --zod 'z.string()' \
  --config-key databaseUrl
```

Do **not** start Step 3 until `config.databaseUrl` exists. Never rewrite existing `.env` values.

### Step 3 — Drizzle foundation (`nextjs-drizzle-setup`)

Load the `nextjs-drizzle-setup` skill. Do **not** hand-write `src/lib/db.ts` or `drizzle.config.ts`. Run:

```bash
DRIZZLE_SKILL="<repo>/.cursor/skills/nextjs-drizzle-setup"
bash "$DRIZZLE_SKILL/scripts/main.sh" --root "{{TARGET}}"
bash "$DRIZZLE_SKILL/scripts/validate.sh" --root "{{TARGET}}"
```

Re-run validate until PASS. Leave drizzle skill assets unchanged.

## Technical Context

- **Entity**: `{{ENTITY}}` (setup sentinel; not a domain model)
- **Target**: `{{TARGET}}`
- **Compose project**: `{{PROJECT}}` → container `{{PROJECT}}-db`
- **Postgres host port**: `{{POSTGRES_PORT}}`
- **DATABASE_URL**: `postgresql://postgres:postgres@localhost:{{POSTGRES_PORT}}/app`
- **Stack**: Docker Compose Postgres, Zod config, Drizzle ORM (RC) + pg + drizzle-kit
- **Automated skill (Execution)**: `{{SKILL_NAME}}` (step 3 only)
- **Guide-only skills**: `docker-compose` (step 1), `nextjs-env-config` (step 2)

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

- Feature CRUD scaffolds and review tickets
- Prisma setup
- Auth, deployment, or CI configuration
- Changing docker-compose / drizzle / env-config skill assets
- Additional compose services (MinIO, Redis, etc.)

## Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | None for canonical Drizzle DB setup | — | closed |
