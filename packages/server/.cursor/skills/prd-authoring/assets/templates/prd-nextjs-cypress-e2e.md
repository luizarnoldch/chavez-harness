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

Generate Cypress CRUD e2e for `{{ENTITY}}` at `{{TARGET}}` after frontend scaffolding — inject `data-cy-*`, merge `cypress/support/selectors.ts`, write `cypress/e2e/{{entity}}s.cy.ts`, and extend db reset TRUNCATE — using only `nextjs-cypress-e2e`.

## Problem Statement

Scaffolded List/FormCreate/FormUpdate need stable selectors and a repeatable create→update→delete spec. Without the canonical skill, agents invent text selectors, skip auth API setup, or forget to truncate the entity table between tests.

## Goals

- [ ] Confirm Cypress harness validate PASS and `{{ENTITY}}` List/FormCreate/FormUpdate exist
- [ ] Generate and validate entity e2e using only `nextjs-cypress-e2e`
- [ ] Keep selectors in `sel.{{entity}}s` and query only via `data-cy-*`

## Non-Goals

- Re-running `nextjs-cypress-setup` or inventing a new runner
- Hand-writing `{{entity}}s.cy.ts` or selector blocks from Cypress docs
- Broad codebase exploration beyond schema + the three components

## User Stories

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-01 | developer / agent | run `nextjs-cypress-e2e --entity {{ENTITY}}` after frontend scaffold | CRUD e2e matches harness conventions |
| US-02 | developer / agent | get `data-cy` + `sel.{{entity}}s` from the skill | specs stay stable across UI copy changes |
| US-03 | developer / agent | truncate `"{{entity}}"` in reset | each test starts from a clean DB |

## Acceptance Criteria

| ID | Story | Criterion |
|---|---|---|
| AC-01 | US-01 | When the skill completes, `bash nextjs-cypress-e2e/scripts/validate.sh --root {{TARGET}} --entity {{ENTITY}}` exits PASS (`cypress/e2e/{{entity}}s.cy.ts`, `sel.{{entity}}s` block) |
| AC-02 | US-02 | When patches complete, List/FormCreate/FormUpdate expose required `data-cy-*` markers for `{{entity_kebab}}` |
| AC-03 | US-03 | `src/db/scripts/reset.ts` TRUNCATE includes the {{ENTITY}} table (snake_case name from the entity) |

## Setup Guide

Execute **in order**. Do not skip ahead.

### Prerequisites (guide-only)

Confirm before running the CLI:

1. **nextjs-cypress-setup** validate PASS (`cypress.config.ts`, support, auth commands)
2. **nextjs-frontend-scaffolding** for `{{ENTITY}}` — `{{ENTITY}}List`, `{{ENTITY}}FormCreate`, `{{ENTITY}}FormUpdate`

Do **not** start the e2e CLI until those exist.

### Step 1 — Entity Cypress e2e (`nextjs-cypress-e2e`)

Load the `nextjs-cypress-e2e` skill. Do **not** hand-write the entity spec or selector block. Run:

```bash
CY_E2E_SKILL="<repo>/.cursor/skills/nextjs-cypress-e2e"
bash "$CY_E2E_SKILL/scripts/main.sh" --root "{{TARGET}}" --entity {{ENTITY}}
bash "$CY_E2E_SKILL/scripts/validate.sh" --root "{{TARGET}}" --entity {{ENTITY}}
```

Re-run validate until PASS. Leave Cypress e2e skill assets unchanged.

### Post-setup

- Dev server on `baseUrl`; run `bun run cy:run` / `test:e2e` to execute specs

## Technical Context

- **Entity**: `{{ENTITY}}` (`{{entity}}` / `{{entity_kebab}}`)
- **Target**: `{{TARGET}}`
- **Stack**: Cypress CRUD via `signUpApi`/`signInApi`, `waitForReact`, `sel.{{entity}}s`
- **Automated skill (Execution)**: `{{SKILL_NAME}}`
- **Guide-only prereqs**: `nextjs-cypress-setup`, `nextjs-frontend-scaffolding`

## Execution

```yaml
kind: {{KIND}}
type: {{TYPE}}
target: {{TARGET}}
skills:
  - name: {{SKILL_NAME}}
    params:
      entity: {{ENTITY}}
```

## Out of Scope

- Cypress harness installation
- Changing Cypress e2e skill assets
- Backend scaffolding unrelated to e2e

## Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | None for canonical entity Cypress e2e | — | closed |
