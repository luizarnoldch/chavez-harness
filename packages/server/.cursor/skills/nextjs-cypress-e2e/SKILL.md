---
name: nextjs-cypress-e2e
description: >-
  Generates Cypress entity CRUD e2e specs after frontend scaffolding — injects
  data-cy attributes, merges cypress/support/selectors.ts, writes
  cypress/e2e/[entity]s.cy.ts, and extends db reset TRUNCATE. Use when the user
  says Cypress e2e for entity, generate CRUD e2e, tasks.cy.ts, data-cy selectors,
  or after nextjs-frontend-scaffolding + nextjs-cypress-setup.
---

# Next.js Cypress entity e2e

CLI + `assets/templates/` are the **only** source of truth for specs and selector
fragments. Do not invent Cypress CRUD tests from memory.

**Violating the letter of the rules is violating the spirit of the rules.**

## Iron law

```
NO HAND-WRITTEN entity.cy.ts / sel.[entity]s — RUN THE CLI
```

Write from memory? Delete them. Run `scripts/main.sh --entity …`. Start over.

**No exceptions:**
- Do not skip `validate.sh`
- Do not invent selector names — use `reference/selector-map.md` / fragment
- Do not set up the Cypress harness here — that is **nextjs-cypress-setup**

## Path resolution

1. Repo root: `git rev-parse --show-toplevel` (or walk up to `.cursor/skills/nextjs-cypress-e2e/SKILL.md`)
2. Skill dir: `<repo-root>/.cursor/skills/nextjs-cypress-e2e`
3. `--root` = absolute Next.js project root (has `src/`)

## Prerequisites

1. **nextjs-cypress-setup** applied (`cypress.config.ts`, support, auth commands, `src/types/import-meta.d.ts` for Bun `ImportMeta.main`)
2. **nextjs-frontend-scaffolding** for the entity (List + FormCreate + FormUpdate)

## Quick start

```bash
SKILL="<repo-root>/.cursor/skills/nextjs-cypress-e2e"
ROOT="<absolute-target-project-root>"

bash "$SKILL/scripts/main.sh" --root "$ROOT" --entity Task
bash "$SKILL/scripts/validate.sh" --root "$ROOT" --entity Task
```

Flags: `--force` (overwrite differing generated spec).

Order: **ensure-data-cy → merge-selectors → generate-spec → ensure-truncate → validate**.

## Executing from a PRD or ticket

If given `features/tasks/prd-*.md` / `ticket-*.md`:

1. Prefer extract-execution for skill `nextjs-cypress-e2e` when present.
2. Otherwise read `## Execution` and take `entity` (and optional `force`).
3. If entity missing, ask.

## Workflow checklist

```
Progress:
- [ ] 1. Resolve SKILL + ROOT + entity; confirm harness + components exist
- [ ] 2. Read schema + List/FormCreate/FormUpdate only (no broad exploration)
- [ ] 3. bash scripts/main.sh --root "$ROOT" --entity <Entity> [--force]
- [ ] 4. validate PASSED
- [ ] 5. Dev server up; bun run cy:run / test:e2e
```

## What gets generated

See `reference/workflow.md`, `reference/selector-map.md`, `reference/examples-task.md`.

```
cypress/support/selectors.ts     # upsert sel.[entity]s
cypress/e2e/[entity]s.cy.ts      # CRUD title flow
src/features/.../components/*    # data-cy if missing
src/db/scripts/reset.ts          # TRUNCATE includes entity table
```

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "Faster to copy tasks.cy.ts by hand" | Templates + replacer keep naming consistent. |
| "Skip data-cy; use text selectors" | Forbidden — use `data-cy-*` + `sel`. |
| "Skip validate" | Mandatory. |

## Red flags — STOP

- Hand-writing entity specs without CLI
- Exploring server/ui files beyond schema + three components
- Running without nextjs-cypress-setup

## Additional resources

- [workflow.md](reference/workflow.md)
- [selector-map.md](reference/selector-map.md)
- [examples-task.md](reference/examples-task.md)
- [snippets.md](assets/data-cy/snippets.md)
