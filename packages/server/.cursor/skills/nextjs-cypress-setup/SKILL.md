---
name: nextjs-cypress-setup
description: >-
  Bootstraps Cypress e2e harness for a Next.js App Router app with better-auth —
  installs cypress, cypress.config.ts, support commands/selectors, auth.cy.ts,
  db reset/seed tasks, package scripts, and auth form data-cy attributes. Use when
  the user says set up Cypress, e2e harness, cypress.config, cy:run, test:e2e, or
  after nextjs-better-auth-frontend before writing entity CRUD e2e specs.
---

# Next.js Cypress harness setup

CLI + `assets/` are the **only** source of truth. Do not invent Cypress config,
commands, or selectors from general Cypress docs.

**Violating the letter of the rules is violating the spirit of the rules.**

## Iron law

```
NO HAND-WRITTEN cypress.config / support / auth.cy — RUN THE CLI
```

Write files from memory? Delete them. Run `scripts/main.sh`. Start over.

**No exceptions:**
- Do not invent alternate runners (Playwright, Vitest browser) in this skill
- Do not add entity CRUD specs here — that is **nextjs-cypress-e2e**
- Do not invent a different `bun add` set — use `install-deps.sh`
- Do not skip `validate.sh`

## Path resolution

Scripts live in this skill folder. Never invoke a bare `scripts/main.sh`.

1. Repo root: `git rev-parse --show-toplevel`. If that fails, walk upward until `.cursor/skills/nextjs-cypress-setup/SKILL.md` exists.
2. Skill dir: `<repo-root>/.cursor/skills/nextjs-cypress-setup`
3. `--root` is the **absolute** Next.js project root (directory containing `src/`).

## Prerequisites

1. **nextjs-drizzle-setup** (`src/db/scripts/{reset,seed}.ts` exist)
2. **nextjs-better-auth-setup** (`src/lib/auth` + auth API route)
3. **nextjs-better-auth-frontend** (sign-in / sign-up forms)

## Quick start

```bash
SKILL="<repo-root>/.cursor/skills/nextjs-cypress-setup"
ROOT="<absolute-target-project-root>"

bash "$SKILL/scripts/main.sh" --root "$ROOT"
bash "$SKILL/scripts/validate.sh" --root "$ROOT"
```

Flags: `--force` (overwrite assets), `--force-install` (re-bun add cypress), `--skip-deps`, `--files-only`.

Order: **deps → files → package scripts → gitignore → db scripts → auth data-cy → validate**.

## Workflow checklist

```
Progress:
- [ ] 1. Resolve SKILL + ROOT (absolute); confirm auth + db scripts exist
- [ ] 2. bash scripts/main.sh --root "$ROOT" [--force / --force-install as needed]
- [ ] 3. bash scripts/validate.sh --root "$ROOT" (must PASS)
- [ ] 4. Dev server on baseUrl (http://localhost:3000) before cy:run
- [ ] 5. Next: nextjs-cypress-e2e --entity <Entity> after frontend scaffolding
```

## What gets installed

See `reference/file-map.md`, `reference/deps.md`, `reference/package-scripts.md`,
`reference/data-cy-conventions.md`.

Canonical tree:

```
cypress.config.ts
cypress/
  support/{commands,selectors,e2e,index.d.ts}.ts
  fixtures/user.json
  e2e/auth.cy.ts
package.json          # cypress + cy:* scripts
.gitignore            # videos/screenshots/downloads
src/types/import-meta.d.ts       # Bun ImportMeta.main for db scripts
src/db/scripts/{reset,seed}.ts   # patched if empty stubs
src/features/auth/components/Auth{SignIn,SignUp}Form.tsx  # data-cy
```

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "I know Cypress; faster from scratch" | Assets encode better-auth + bun tasks + sel map. |
| "Add Playwright while I'm here" | Out of scope. |
| "Skip validate — looks fine" | validate is mandatory. |
| "Generate tasks.cy.ts now" | Use **nextjs-cypress-e2e**. |

## Red flags — STOP

- Hand-writing `cypress.config.ts` or support commands
- Skipping `validate.sh`
- Adding entity specs inside this skill

## Additional resources

- [file-map.md](reference/file-map.md)
- [deps.md](reference/deps.md)
- [package-scripts.md](reference/package-scripts.md)
- [data-cy-conventions.md](reference/data-cy-conventions.md)
