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

[fill] Short summary of the {{ENTITY}} frontend experience this slice delivers.

## Problem Statement

[fill] Why this UI is needed.

## Goals

- [ ] [fill] Goal 1
- [ ] [fill] Goal 2

## Non-Goals

- [fill] Out of scope item

## User Stories

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-01 | [fill] | [fill] | [fill] |

## Acceptance Criteria

| ID | Story | Criterion |
|---|---|---|
| AC-01 | US-01 | [fill] When ... the system shall ... |

## UI/UX

### Pages

| Route | Component | Description |
|---|---|---|
| `/{{entity_kebab}}s` | `{{ENTITY}}View` | [fill] List page |

### Component Tree

```
{{ENTITY}}View
├── {{ENTITY}}List
├── {{ENTITY}}FormCreate
└── {{ENTITY}}FormUpdate
```

## Technical Context

- **Entity**: `{{ENTITY}}` (`{{entity}}` / `{{entity_kebab}}`)
- **Flag**: `{{FLAG}}`
- **Transport**: {{TRANSPORT}}
- **Target**: `{{TARGET}}`
- **Pages**: thin `src/app/` wrappers; views/components under `src/features/{{entity}}/`
- **Dependency**: backend hooks for {{ENTITY}} must exist first

## Execution

```yaml
kind: {{KIND}}
type: {{TYPE}}
target: {{TARGET}}
skills:
  - name: {{SKILL_NAME}}
    params:
      entity: {{ENTITY}}
      flag: "{{FLAG}}"
      transport: {{TRANSPORT}}
```

## Out of Scope

- [fill]

## Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | [fill] | design | open |
