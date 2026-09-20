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

Bootstrap the Cypress e2e harness at `{{TARGET}}` — `cypress.config.ts`, support commands/selectors, `auth.cy.ts`, db reset/seed tasks, package scripts, and auth form `data-cy` attributes — using only `nextjs-cypress-setup` until validate PASS.

## Problem Statement

Entity CRUD e2e specs assume a shared Cypress harness (auth commands, `db:reset`/`db:seed` tasks, `sel` map). Without an ordered setup, agents invent Playwright configs, hand-write support files, or add entity specs before the harness validates.

## Goals

- [ ] Confirm better-auth foundation + auth frontend and callable `src/db/scripts/{reset,seed}.ts`
- [ ] Install and validate the Cypress harness using only `nextjs-cypress-setup` (CLI + validate)
- [ ] Leave entity CRUD specs to the Cypress e2e PRD

## Non-Goals

- Entity CRUD specs (`cypress/e2e/[entity]s.cy.ts`) — use `nextjs-cypress-e2e`
- Alternate runners (Playwright, Vitest browser)
- Hand-writing `cypress.config.ts` or support commands from Cypress docs

## User Stories

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-01 | developer / agent | run `nextjs-cypress-setup` after auth frontend exists | Cypress config, support, and auth.cy match project assets |
| US-02 | developer / agent | get `cy:*` / `test:e2e` scripts and auth `data-cy` from the skill | auth UI specs and later entity specs share one harness |
| US-03 | developer / agent | stop after harness validate PASS | the Cypress e2e PRD can generate entity specs without inventing foundation files |

## Acceptance Criteria

| ID | Story | Criterion |
|---|---|---|
| AC-01 | US-01 | When the skill completes, `bash nextjs-cypress-setup/scripts/validate.sh --root {{TARGET}}` exits PASS (`cypress.config.ts`, `cypress/support/*`, `cypress/e2e/auth.cy.ts`, cypress dep, `cy:*` scripts) |
| AC-02 | US-02 | When patches complete, auth forms have `data-cy-submit-sign-*-form`, `.gitignore` ignores Cypress artifacts, and `reset`/`seed` scripts are callable from Cypress tasks |
| AC-03 | US-03 | No entity CRUD specs are added by this PRD |

## Setup Guide

Execute **in order**. Do not skip ahead. The automated skill in `## Execution` is the only step that installs files.

### Prerequisites (guide-only)

Confirm before running the CLI:

1. **nextjs-drizzle-setup** — `src/db/scripts/{reset,seed}.ts` exist
2. **nextjs-better-auth-setup** — `src/lib/auth` + auth API route
3. **nextjs-better-auth-frontend** — `AuthSignInForm` / `AuthSignUpForm`

Do **not** start the Cypress setup CLI until those exist.

### Step 1 — Cypress harness (`nextjs-cypress-setup`)

Load the `nextjs-cypress-setup` skill. Do **not** hand-write Cypress config or support files. Run:

```bash
CY_SKILL="<repo>/.cursor/skills/nextjs-cypress-setup"
bash "$CY_SKILL/scripts/main.sh" --root "{{TARGET}}"
bash "$CY_SKILL/scripts/validate.sh" --root "{{TARGET}}"
```

Re-run validate until PASS. Leave Cypress setup skill assets unchanged.

### Post-setup

- Dev server must listen on `baseUrl` (`http://localhost:3000`) before `cy:run`
- Next PRD: `nextjs-cypress-e2e` for entity CRUD specs after frontend scaffolding

## Technical Context

- **Entity**: `{{ENTITY}}` (setup sentinel; not a domain model)
- **Target**: `{{TARGET}}`
- **Stack**: Cypress e2e, bun tasks for db reset/seed, better-auth API/UI commands
- **Automated skill (Execution)**: `{{SKILL_NAME}}`
- **Guide-only prereqs**: `nextjs-drizzle-setup`, `nextjs-better-auth-setup`, `nextjs-better-auth-frontend`
- **Follow-on**: `nextjs-cypress-e2e`

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

- Entity CRUD e2e generation
- Changing Cypress skill assets
- Feature CRUD scaffolds unrelated to the harness

## Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | None for canonical Cypress harness setup | — | closed |
