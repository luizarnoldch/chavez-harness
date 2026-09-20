# Selector map (`data-cy-*` ↔ `sel.[entity]s`)

Placeholders: `[entity-kebab]` (e.g. `task`), camel `[entity]` (e.g. `task`).

| Role | Attribute | `sel.[entity]s` key |
|------|-----------|---------------------|
| List root | `data-cy-[entity-kebab]-list="[entity-kebab]-list"` | `list` |
| Open create | `data-cy-submit-create-[entity-kebab]-btn="create-[entity-kebab]-btn"` | `openCreateBtn` |
| Create form | `data-cy-submit-create-[entity-kebab]-form="create-[entity-kebab]-form"` | `createForm` |
| Create title | `data-cy-create-[entity-kebab]-title-input="[entity-kebab]-title-input"` | `createTitleInput` |
| Create cancel | `data-cy-create-[entity-kebab]-cancel-btn="create-[entity-kebab]-cancel"` | `createCancelBtn` |
| Create submit | `data-cy-submit-create-[entity-kebab]-btn="create-[entity-kebab]-submit"` | `createSubmitBtn` |
| Row | `data-cy-[entity-kebab]-row="[entity-kebab]-row"` | `row` |
| Title cell | `data-cy-[entity-kebab]-title="[entity-kebab]-title"` | `title` |
| Edit | `data-cy-submit-edit-[entity-kebab]-btn="[entity-kebab]-edit-btn"` | `editBtn` |
| Delete | `data-cy-submit-delete-[entity-kebab]-btn="[entity-kebab]-delete-btn"` | `deleteBtn` |
| Update form | `data-cy-update-[entity-kebab]-form="update-[entity-kebab]-form"` | `updateForm` |
| Update title | `data-cy-update-[entity-kebab]-title-input="[entity-kebab]-title-input"` | `updateTitleInput` |
| Update cancel | `data-cy-update-[entity-kebab]-cancel-btn="update-[entity-kebab]-cancel"` | `updateCancelBtn` |
| Update submit | `data-cy-update-[entity-kebab]-submit="update-[entity-kebab]-submit"` | `updateSubmitBtn` |

Query always with `[attr="value"]`. Attribute **names** may be shared; values must be unique.

Canonical fragment: `assets/templates/selectors-entity.ts.frag`.
