---
kind: {{KIND}}
type: {{TYPE}}
id: {{ID}}
status: draft
created: {{DATE}}
entity: {{ENTITY}}
{{FEATURE_ID_LINE}}---

# Ticket: {{TITLE}}

## Summary

[fill] Scaffold frontend pages/views/components for {{ENTITY}} (`{{FLAG}}`).

## Goal

Generate the {{ENTITY}} UI via `{{SKILL_NAME}}` using existing hooks; do not invent a parallel component pattern.

## Acceptance criteria

- [ ] CLI ran with Execution params (`{{FLAG}}`)
- [ ] Output files for that flag exist (page/view/list/forms as requested)
- [ ] List/forms use schema fields, not template comments

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

## Notes

[fill] Hooks must already exist. Follow-up review is a separate `frontend-review` ticket.
