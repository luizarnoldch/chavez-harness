# Example: Task

Canonical consumer after frontend scaffolding for `task`:

- Components under `src/features/task/components/`
- Spec: `cypress/e2e/tasks.cy.ts`
- Selectors block: `sel.tasks` in `cypress/support/selectors.ts`
- Reset truncates `"task"` plus auth tables

Flow mirrors `assets/templates/entity.cy.ts`:

1. `signUpApi` + `signInApi` from fixture `user`
2. Visit `/tasks`, `waitForReact(sel.tasks.list)`
3. Create → edit title → delete → empty state

Optional fields (e.g. `completed` checkbox) may be added manually beyond the title-only template; keep naming consistent with `reference/selector-map.md`.

Generate / refresh:

```bash
bash <skill>/scripts/main.sh --root "$ROOT" --entity Task [--force]
```
