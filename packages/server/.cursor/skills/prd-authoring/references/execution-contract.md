# Execution contract

Every PRD and ticket has a `## Execution` section with a single fenced YAML block. Scaffolding and reviewer skills read this block (prefer `extract-execution.sh`) instead of inventing CLI flags.

## YAML shape

```yaml
kind: prd
type: backend-scaffold
target: /abs/path/to/nextjs-app
skills:
  - name: nextjs-backend-scaffolding
    params:
      entity: Product
      layers: all
      transport: trpc
      database: prisma
```

Frontend scaffold:

```yaml
kind: ticket
type: frontend-scaffold
target: /abs/path/to/nextjs-app
skills:
  - name: nextjs-frontend-scaffolding
    params:
      entity: Product
      flag: "--all"
      transport: trpc
```

Review ticket:

```yaml
kind: ticket
type: backend-review
target: /abs/path/to/nextjs-app
skills:
  - name: nextjs-backend-scaffolding-reviewer
    params:
      entity: Product
      transport: trpc
      database: prisma
```

Next.js init (tRPC foundation only in Execution; create-app + shadcn + env-config live in the PRD Setup Guide as steps 1–2 and 4):

```yaml
kind: prd
type: nextjs-init
target: /abs/path/to/nextjs-app
skills:
  - name: nextjs-trpc-setup
    params:
```

Next.js Drizzle DB setup (drizzle only in Execution; docker-compose + env-config live in the PRD Setup Guide as steps 1–2):

```yaml
kind: prd
type: nextjs-db-setup
target: /abs/path/to/nextjs-app
skills:
  - name: nextjs-drizzle-setup
    params:
```

Cypress harness setup:

```yaml
kind: prd
type: nextjs-cypress-setup
target: /abs/path/to/nextjs-app
skills:
  - name: nextjs-cypress-setup
    params:
```

Cypress entity e2e:

```yaml
kind: prd
type: nextjs-cypress-e2e
target: /abs/path/to/nextjs-app
skills:
  - name: nextjs-cypress-e2e
    params:
      entity: Task
```

## Rules

- Exactly one entry in `skills` (primary skill for this document).
- `name` must be one of:
  - `nextjs-backend-scaffolding`
  - `nextjs-frontend-scaffolding`
  - `nextjs-backend-scaffolding-reviewer`
  - `nextjs-frontend-scaffolding-reviewer`
  - `nextjs-trpc-setup`
  - `nextjs-drizzle-setup`
  - `nextjs-better-auth-setup`
  - `nextjs-better-auth-frontend`
  - `nextjs-cypress-setup`
  - `nextjs-cypress-e2e`
- `params` values are scalars (strings). Quote flags that start with `--`. Empty `params:` is allowed when the type requires no keys (`nextjs-init`, `nextjs-db-setup`, `nextjs-better-auth-setup`, `nextjs-better-auth-frontend`, `nextjs-cypress-setup`).
- `target` is an absolute path to the Next.js project root (directory containing `src/` after init).
- `kind` / `type` in the block must match YAML frontmatter.
- `params.entity` must match frontmatter `entity` only when `entity` is a required param for that type.

## Frontmatter (machine-readable twin)

```yaml
---
kind: prd
type: backend-scaffold
id: prd-catalog-backend-v1
status: draft
created: 2026-08-17
entity: Product
feature_id: NOV-1
---
```

`feature_id` is optional (handoff only). `entity` is required in frontmatter (for setup types `nextjs-init` / `nextjs-db-setup` / `nextjs-better-auth-setup` / `nextjs-better-auth-frontend` / `nextjs-cypress-setup`, create defaults to `App`).

## extract-execution.sh

```bash
bash scripts/extract-execution.sh features/tasks/prd-catalog-backend/prd.md
bash scripts/extract-execution.sh features/tasks/prd-catalog-backend/prd.md \
  --skill=nextjs-backend-scaffolding
```

Without `--skill`, prints the full object:

```json
{
  "kind": "prd",
  "type": "backend-scaffold",
  "target": "/abs/path",
  "skills": [
    {
      "name": "nextjs-backend-scaffolding",
      "params": {
        "entity": "Product",
        "layers": "all",
        "transport": "trpc",
        "database": "prisma"
      }
    }
  ]
}
```

With `--skill`, prints one skill plus `target`:

```json
{
  "kind": "prd",
  "type": "backend-scaffold",
  "target": "/abs/path",
  "skill": "nextjs-backend-scaffolding",
  "params": { "entity": "Product", "layers": "all", "transport": "trpc", "database": "prisma" }
}
```

Exit `1` if the fence is missing, YAML is not this subset, or `--skill` is not in `skills`.

## Consumer rules (nextjs skills)

1. If given a `features/tasks/prd-<slug>/prd.md` or `features/tasks/ticket-<slug>/ticket.md` path, extract params before asking the user.
2. Use `params` (+ `target`) as CLI arguments. Do not invent values already present.
3. If a required param is missing, ask. If no PRD/ticket path is given, keep the skill's existing decision flow.
