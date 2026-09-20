# Feature workflows

## Multi-sprint planning → close → archive

```
Progress:
- [ ] init --title (current sprint window)
- [ ] add features for sprint 1 and --sprint=2/3 backlog
- [ ] create PRD/ticket via prd-authoring, then link-prd / update status / complete PRDs
- [ ] when all PRDs completed: ask user → update --status=done
- [ ] archive mid-sprint if needed → features/sprints/N.yml
- [ ] close-sprint when window ends (archives done/deployed of current N)
- [ ] validate after each mutation
```

Example:

```bash
bash scripts/feature-cli.sh --root "$ROOT" init --title="Novetec Ecommerce" --acronym=NOV \
  --sprint=1 --sprint-start=2026-08-01 --sprint-end=2026-08-14
bash scripts/feature-cli.sh --root "$ROOT" add "Auth Gateway" "OAuth2"                 # NOV-1 sprint 1
bash scripts/feature-cli.sh --root "$ROOT" add --sprint=2 "Profile UI" "Screens"       # NOV-2 sprint 2
bash scripts/feature-cli.sh --root "$ROOT" update --id=NOV-1 --status=done
bash scripts/feature-cli.sh --root "$ROOT" close-sprint \
  --next-start=2026-08-15 --next-end=2026-08-28
# → features/sprints/1.yml (closed_at + NOV-1), current sprint = 2
bash scripts/validate.sh --root "$ROOT"
```

## Blocking vs related

**Blocking:** `update --id=A --blocks=B` (mirrors `blocked_by`).

**Related:** soft grouping only.

## PRD sequencing

| Pattern | How |
|---------|-----|
| Strict chain | Distinct `order`, `sequential` |
| Fan-out | Same `order`, `parallel` |

Mark PRDs complete with `--complete-prd=` / `--prd-completed=`.

When **all** linked PRDs have `completed: true`, ask the user whether to mark the feature `--status=done`. Do not auto-apply.

## Archiving

1. Mid-sprint: `archive <ID>` → `features/sprints/{feature.sprint}.yml`
2. End of sprint: `close-sprint` archives remaining **done** and **deployed** features of the current sprint number and seals `closed_at`
3. History lives in per-sprint files under `features/sprints/`, not a flat ARCHIVE list

## Reading state

Always `list` before mutating. Prefer CLI output over chat memory.
