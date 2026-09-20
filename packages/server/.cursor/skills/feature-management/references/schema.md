# Feature registry schema

## Files

| File | Role |
|------|------|
| `FEATURES.yml` | Project + **current** sprint + active features |
| `features/sprints/{N}.yml` | Archive for sprint N |
| `features/changes.log` | Append-only action history |
| `features/ARCHIVE.yml` | Legacy; auto-migrated into `sprints/` |

## Project + current sprint (`FEATURES.yml`)

```yaml
project:
  title: "Novetec Ecommerce"
  acronym: "NOV"

sprint:                      # current sprint only
  number: 2
  start: "2026-08-15"
  end: "2026-08-28"

features:
  - id: NOV-3
    sprint: 2                # planned sprint (may be > current)
    name: "..."
    ...
  - id: NOV-4
    sprint: 3                # backlog for a future sprint
    status: draft
    ...
```

## Per-sprint archive (`features/sprints/{N}.yml`)

```yaml
project:
  title: "Novetec Ecommerce"
  acronym: "NOV"

sprint:
  number: 1
  start: "2026-08-01"
  end: "2026-08-14"
  closed_at: "2026-08-14T20:00:00Z"   # set by close-sprint; empty if only partial archives

archive:
  - id: NOV-1
    sprint: 1
    status: archived
    archived_at: "2026-08-14T18:00:00Z"
    ...
```

## Feature fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | `{acronym}-N` without leading zeros |
| `sprint` | int ≥ 1 | Planned sprint; default = current on `add` |
| `status` | enum | `draft` … `done` … `deployed` (active) / `archived` |
| `locked` | bool | Soft lock |
| `blocks` / `blocked_by` / `related_to` | string[] | Relations |
| `prds` | object[] | `path`, `order`, `execution`, `completed` |

## Log actions

`INIT` | `ADD_FEATURE` | `UPDATE_FEATURE` | `LINK_PRD` | `ARCHIVE_FEATURE` | `SET_SPRINT` | `CLOSE_SPRINT` | `COMPLETE_PRD` | `MIGRATE_ARCHIVE`

## Validation

- `project.acronym` ∈ `^[A-Z]{3}$`; ids `^{acronym}-[1-9][0-9]*$`
- `feature.sprint` integer ≥ 1
- `features/sprints/{N}.yml` → `sprint.number` must equal `N`
- Unique IDs across active + all sprint archives
- Mirror `blocks` / `blocked_by`

## Compatibility

- Missing `feature.sprint` → normalized to current sprint on read
- Legacy `ARCHIVE.yml` entries → migrated into `features/sprints/{N}.yml` on init/validate
