# data-cy conventions

## Rules

1. Use custom attributes `data-cy-<role>="<stable-value>"` (not only `data-cy`).
2. Always query with attribute selectors: `[data-cy-role="value"]`.
3. Keep a single map in `cypress/support/selectors.ts` as `sel`.
4. Auth harness (this skill):

| Element | Attribute |
|---------|-----------|
| Sign-up form | `data-cy-submit-sign-up-form="sign-up-form"` |
| Sign-in form | `data-cy-submit-sign-in-form="sign-in-form"` |

5. Entity CRUD attributes are owned by **nextjs-cypress-e2e** — see that skill's `reference/selector-map.md`.

## Commands (assets)

| Command | Purpose |
|---------|---------|
| `waitForReact(selector)` | Assert React fiber hydration |
| `signUpUi` / `signInUi` | UI auth flows |
| `signUpApi` / `signInApi` | Fast API auth + cookies for CRUD specs |
