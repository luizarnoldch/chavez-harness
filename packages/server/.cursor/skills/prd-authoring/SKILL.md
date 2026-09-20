---
name: prd-authoring
description: >-
  Creates PRDs and execution tickets under features/tasks/ from type-specific
  templates, with a machine-readable Execution block that nextjs scaffolding
  and reviewer skills consume. Use when the user mentions create PRD, write
  PRD, ticket, spec, prd-cli, features/tasks/prd-, features/tasks/ticket-,
  execution block, backend-scaffold, frontend-scaffold, nextjs-init,
  nextjs-db-setup, drizzle database setup PRD, nextjs-cypress-setup,
  nextjs-cypress-e2e, Cypress setup PRD, Cypress e2e PRD, or linking a new
  PRD to a feature. Does not mutate FEATURES.yml — hand off link-prd to
  feature-management.
compatibility: >-
  Requires bash. jq is auto-installed into scripts/.vendor/bin on first
  non-help run if missing (needs network). Writes features/tasks/prd-*/prd.md
  and features/tasks/ticket-*/ticket.md under the target project root. Never
  writes FEATURES.yml.
metadata:
  author: command-center
  version: "1.0"
---

# PRD Authoring

Create PRDs (full spec) and tickets (execution unit) via the bundled CLI. Do not hand-write these files when the CLI can emit the stub.

**If unsure how to invoke the CLI, run `help` then `help --json` before any mutation.**

This skill only creates and validates documents. Linking them to features is **feature-management** (`link-prd`). Never edit `FEATURES.yml` from here.

## Paths

Runtime files (target project root, `--root` or cwd):

- `features/tasks/prd-<slug>/prd.md` — full-spec PRDs
- `features/tasks/prd-<slug>/logs/` — implementation logs (feature-completer)
- `features/tasks/ticket-<slug>/ticket.md` — execution tickets

Skill files (this directory):

- `assets/templates/` — one template per kind+type
- `scripts/prd-cli.sh` — create / list
- `scripts/validate.sh` — contract checks
- `scripts/extract-execution.sh` — JSON params for the 4 nextjs skills

## Path resolution

Scripts live in this skill folder, not in the target project. Never invoke a bare `scripts/prd-cli.sh`.

1. Repo root: `git rev-parse --show-toplevel`. If that fails, walk upward until `.cursor/skills/prd-authoring/SKILL.md` exists.
2. CLI: `<repo-root>/.cursor/skills/prd-authoring/scripts/prd-cli.sh`
3. `<root>` (`--root`) is the **absolute path** of the target project (the directory that will contain `features/tasks/`). If a calling agent handed you this path, use it exactly.

## Quick start

```bash
SKILL="<skill-dir>"
ROOT="<target-project-root>"

bash "$SKILL/scripts/prd-cli.sh" help --json
bash "$SKILL/scripts/prd-cli.sh" --root "$ROOT" create \
  --kind=prd --type=backend-scaffold --name=catalog-backend \
  --entity=Product --layers=all --transport=trpc --database=prisma \
  --feature=NOV-1
bash "$SKILL/scripts/validate.sh" --root "$ROOT"
```

## Workflow checklist

```
Progress:
- [ ] 0. help --json
- [ ] 1. create stub (CLI)
- [ ] 2. Fill human sections from the template (do not rewrite ## Execution)
- [ ] 3. validate.sh
- [ ] 4. If HANDOFF action is link-prd: load feature-management and run link-prd
- [ ] 5. One document = one primary skill; review = a separate ticket
```

## Commands

```bash
bash "$SKILL/scripts/prd-cli.sh" --root "$ROOT" create \
  --kind=<prd|ticket> --type=<type> --name=<slug> --entity=<Entity> \
  [--layers=schema|server|hooks|all] [--transport=trpc|api] [--database=prisma|drizzle] \
  [--project=<prefix>] [--postgres-port=<port>] \
  [--flag='--all'] [--target=<abs-next-app>] \
  [--feature=<ID>] [--order=N] [--execution=sequential|parallel] \
  [--out=<path>] [--force]
bash "$SKILL/scripts/prd-cli.sh" --root "$ROOT" list
bash "$SKILL/scripts/validate.sh" --root "$ROOT" [--path=features/tasks/prd-<slug>/prd.md]
bash "$SKILL/scripts/extract-execution.sh" <file> [--skill=<skill-name>]
```

`--target` defaults to `--root`. `--flag` applies to `frontend-scaffold` (`--all`, `--page list`, `--view`, `--view-full`). `--project` and `--postgres-port` are required for `nextjs-db-setup`. `--entity` is required for `nextjs-cypress-e2e`.

## Kinds and types

| Kind | Role |
|------|------|
| `prd` | Full spec: overview, stories, AC, data model or UI/UX, then Execution |
| `ticket` | Short: summary, goal, AC checklist, Execution (payload) |

| type | kind | Skill in Execution |
|------|------|--------------------|
| `backend-scaffold` | prd or ticket | `nextjs-backend-scaffolding` |
| `frontend-scaffold` | prd or ticket | `nextjs-frontend-scaffolding` |
| `backend-review` | ticket only | `nextjs-backend-scaffolding-reviewer` |
| `frontend-review` | ticket only | `nextjs-frontend-scaffolding-reviewer` |
| `nextjs-init` | prd only | `nextjs-trpc-setup` (steps 1–2 and 4 are guide-only; step 4 = `nextjs-env-config`) |
| `nextjs-db-setup` | prd only | `nextjs-drizzle-setup` (steps 1–2 guide-only: `docker-compose` + `nextjs-env-config`) |
| `nextjs-better-auth-setup` | prd only | `nextjs-better-auth-setup` (`BETTER_AUTH_*` via skill `sync-env` → `add-env-var`) |
| `nextjs-better-auth-frontend` | prd only | `nextjs-better-auth-frontend` (after foundation validate PASS) |
| `nextjs-cypress-setup` | prd only | `nextjs-cypress-setup` (after better-auth frontend) |
| `nextjs-cypress-e2e` | prd only | `nextjs-cypress-e2e` (requires `--entity`; after harness + frontend scaffold) |

## After create

1. Fill placeholder prose in the stub (`[fill]`, goals, stories, AC, data model / UI). **Leave `## Execution` unchanged.**
2. Run `validate.sh`.
3. Read the `HANDOFF:feature-management` block on stdout. If `action: link-prd`, load the `feature-management` skill and run `link-prd` with those fields. Do not call `feature-cli.sh` from this skill's scripts.

## When to load references

- Template catalog + required params → [references/types.md](references/types.md)
- Execution YAML/JSON contract → [references/execution-contract.md](references/execution-contract.md)
- Feature-management handoff → [references/feature-handoff.md](references/feature-handoff.md)

## Gotchas

- Never mutate `FEATURES.yml` or invoke `feature-cli.sh` from this skill.
- Do not invent a second skill in the same document; add a ticket and link it with `order` / `sequential`.
- `--root` is the project that owns `features/tasks/`, not necessarily the git toplevel.
- Historical ecommerce specs under `specs/completed/` are not this contract; new work goes to `features/tasks/`.
