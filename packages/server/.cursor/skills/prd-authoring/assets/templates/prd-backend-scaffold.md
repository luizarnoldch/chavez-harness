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

[fill] Short summary of what this backend slice delivers for {{ENTITY}}.

## Problem Statement

[fill] Why this backend layer is needed.

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

## Data Model

### Entity: {{ENTITY}}

| Field | Type | Required | Notes |
|---|---|---|---|
| id | String | yes | Primary key |
| [fill] | [fill] | yes | [fill] |

## Technical Context

- **Entity**: `{{ENTITY}}` (`{{entity}}` / `{{entity_kebab}}`)
- **Layers**: {{LAYERS}}
- **Transport**: {{TRANSPORT}}
- **Database**: {{DATABASE}}
- **Target**: `{{TARGET}}`
- **Output**: `src/features/{{entity}}/`

## Execution

```yaml
kind: {{KIND}}
type: {{TYPE}}
target: {{TARGET}}
skills:
  - name: {{SKILL_NAME}}
    params:
      entity: {{ENTITY}}
      layers: {{LAYERS}}
      transport: {{TRANSPORT}}
      database: {{DATABASE}}
```

## Out of Scope

- [fill]

## Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | [fill] | eng | open |
