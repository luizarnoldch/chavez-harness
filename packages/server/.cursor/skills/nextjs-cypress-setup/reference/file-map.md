# File map (asset → destination)

All paths relative to skill `assets/` and target project root.

| Asset | Destination |
|-------|-------------|
| `cypress.config.ts` | `cypress.config.ts` |
| `cypress/support/commands.ts` | `cypress/support/commands.ts` |
| `cypress/support/selectors.ts` | `cypress/support/selectors.ts` |
| `cypress/support/e2e.ts` | `cypress/support/e2e.ts` |
| `cypress/support/index.d.ts` | `cypress/support/index.d.ts` |
| `cypress/fixtures/user.json` | `cypress/fixtures/user.json` |
| `cypress/e2e/auth.cy.ts` | `cypress/e2e/auth.cy.ts` |
| `types/import-meta.d.ts` | `src/types/import-meta.d.ts` |

Install via `scripts/install-files.sh --root <ROOT>` (or `main.sh`).

## Patched (not byte-copied assets)

| Target | Script |
|--------|--------|
| `package.json` | `patch-package-scripts.sh` — `cy:*` + `test:e2e` |
| `.gitignore` | `patch-gitignore.sh` — videos/screenshots/downloads |
| `src/db/scripts/reset.ts` | `patch-db-scripts.sh` — if empty stub |
| `src/db/scripts/seed.ts` | `patch-db-scripts.sh` — if empty stub |
| Auth forms | `patch-auth-data-cy.sh` — `data-cy-submit-sign-*-form` |

## Patch assets

| Asset | Destination (when stub empty) |
|-------|-------------------------------|
| `patches/db/reset.ts` | `src/db/scripts/reset.ts` |
| `patches/db/seed.ts` | `src/db/scripts/seed.ts` |

## Prerequisites

- **nextjs-drizzle-setup**: `src/db/scripts/{reset,seed}.ts` exist
- **nextjs-better-auth-setup**: `src/lib/auth/index.ts` + auth API route
- **nextjs-better-auth-frontend**: `AuthSignInForm` / `AuthSignUpForm`
