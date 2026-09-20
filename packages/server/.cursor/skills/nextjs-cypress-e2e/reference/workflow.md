# Workflow: entity CRUD e2e

After **nextjs-cypress-setup** and **nextjs-frontend-scaffolding** for `<entity>`:

1. Resolve `ROOT` + `--entity` (PascalCase or kebab-case).
2. Read only:
   - `src/features/[entity]/schemas/[entity].schema.ts`
   - `.../components/[Entity]List/index.tsx`
   - `.../components/[Entity]FormCreate.tsx`
   - `.../components/[Entity]FormUpdate.tsx`
3. Run CLI (preferred):

```bash
SKILL="<repo-root>/.cursor/skills/nextjs-cypress-e2e"
bash "$SKILL/scripts/main.sh" --root "$ROOT" --entity <Entity>
```

Order encoded in `main.sh`:

1. `ensure-data-cy.sh` — inject missing `data-cy-*`
2. `merge-selectors.sh` — upsert `sel.[entity]s` in `cypress/support/selectors.ts`
3. `generate-spec.sh` — write `cypress/e2e/[entity]s.cy.ts`
4. `ensure-truncate.sh` — add `"entity"` table to `reset.ts` TRUNCATE
5. `validate.sh` — must PASS

Do not invent selectors or specs from Cypress docs — use `assets/templates/`.
