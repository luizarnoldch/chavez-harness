---
name: feature-management
description: >-
  Manages the project feature registry (FEATURES.yml), current sprint metadata,
  per-feature planned sprint, relationships (blocks/blocked_by/related_to),
  multi-PRD links with sequential/parallel execution and completed flags,
  per-sprint archives under features/sprints/{N}.yml, and append-only history in
  features/changes.log. Use when the user mentions features, FEATURES.yml,
  feature-cli, link PRD, archive feature, close-sprint, sprint planning,
  feature status, or feature dependencies.
compatibility: >-
  Requires bash. jq is auto-installed into scripts/.vendor/bin on first
  non-help run if missing (needs network). Writes FEATURES.yml,
  features/sprints/, and features/changes.log under the target project root.
metadata:
  author: command-center
  version: "1.6"
---

# Feature Management

Operate the feature registry via the bundled CLI. Do not hand-edit YAML when the CLI can do the change.

**If unsure how to invoke the CLI, run `help` then `help --json` before any mutation.**

## Paths

Runtime files (target project root, `--root` or cwd):

- `FEATURES.yml` — project + **current** sprint + active features (each with `sprint: N`)
- `features/sprints/{N}.yml` — archive for sprint N (`closed_at` when closed)
- `features/changes.log` — append-only action history
- `features/ARCHIVE.yml` — legacy only; migrated automatically into `sprints/`
- `features/tasks/prd-[name]/prd.md` — PRD documents (created by **prd-authoring**, not this skill)
- `features/tasks/ticket-[name]/ticket.md` — execution tickets (also created by **prd-authoring**; link with `link-prd`)

## Quick start

```bash
SKILL="<skill-dir>"
ROOT="<target-project-root>"

bash "$SKILL/scripts/feature-cli.sh" help --json
bash "$SKILL/scripts/feature-cli.sh" --root "$ROOT" init --title "Novetec Ecommerce" --acronym=NOV \
  --sprint=1 --sprint-start=2026-08-01 --sprint-end=2026-08-14
bash "$SKILL/scripts/feature-cli.sh" --root "$ROOT" add "Auth" "desc"           # sprint 1
bash "$SKILL/scripts/feature-cli.sh" --root "$ROOT" add --sprint=2 "Pay" "desc" # backlog sprint 2
```

## Workflow checklist

```
Progress:
- [ ] 0. help --json
- [ ] 1. init --title (+ acronym/sprint window)
- [ ] 2. add features with --sprint=N for multi-sprint planning
- [ ] 3. work: create PRD/ticket via **prd-authoring**, then link-prd / update status / complete PRDs
- [ ] 4. when all PRDs completed: ask user → update --status=done
- [ ] 5. archive ID  OR  close-sprint when the window ends
- [ ] 6. validate.sh after mutations
```

## Commands

```bash
bash scripts/feature-cli.sh --root "$ROOT" init --title "..." [--acronym=ABC] [--sprint=N --sprint-start=... --sprint-end=...]
bash scripts/feature-cli.sh --root "$ROOT" list
bash scripts/feature-cli.sh --root "$ROOT" add [--sprint=N] "Name" "Description"
bash scripts/feature-cli.sh --root "$ROOT" update --id=<ID> [--sprint=N] [--status=...] ...
bash scripts/feature-cli.sh --root "$ROOT" link-prd <ID> <path> <ord> <sequential|parallel>
bash scripts/feature-cli.sh --root "$ROOT" sprint --number=N --start=YYYY-MM-DD --end=YYYY-MM-DD
bash scripts/feature-cli.sh --root "$ROOT" close-sprint --next-start=... --next-end=... [--next-number=N]
bash scripts/feature-cli.sh --root "$ROOT" archive <ID>
bash scripts/validate.sh --root "$ROOT"
```

Status lifecycle: `draft → in_progress → testing → blocked → done → deployed → archived`.

## Agent rules

- After `--complete-prd` (or when listing a feature), if **every** linked `prds[].completed` is `true` and the feature status is not already `done`, `deployed`, or `archived`, **ask the user** whether to mark the feature as done:
  ```bash
  bash scripts/feature-cli.sh --root "$ROOT" update --id=<ID> --status=done
  ```
- Do **not** set `--status=done` automatically. Wait for explicit user confirmation.
- Do not set `testing` or `deployed` unless the user asks.

## When to load references

- Schema → [references/schema.md](references/schema.md)
- CLI → [references/cli.md](references/cli.md)
- Workflows → [references/workflows.md](references/workflows.md)

## Gotchas

- Current sprint is file-level on `FEATURES.yml`; planned sprint is per feature (`sprint: N`).
- Archives go to `features/sprints/{N}.yml`, not a flat ARCHIVE list.
- `close-sprint` archives **done** and **deployed** features of the current sprint number, sets `closed_at`, advances current sprint.
- `add` defaults `sprint` to the current sprint number.
- Prefer CLI over hand-edits so `changes.log` stays consistent.
- Do not author PRD/ticket content here. Use **prd-authoring** (`features/tasks/prd-*/prd.md` / `features/tasks/ticket-*/ticket.md`), then `link-prd`. `prds[].path` may point at either.
