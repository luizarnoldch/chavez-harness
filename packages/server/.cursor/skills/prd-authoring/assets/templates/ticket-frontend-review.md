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

[fill] Review frontend scaffold for {{ENTITY}} ({{TRANSPORT}}). Read-only.

## Goal

Run `{{SKILL_NAME}}` against `{{TARGET}}` and report PASS/FAIL from `validate.sh`. Do not write code.

## Acceptance criteria

- [ ] Validator ran with Execution params
- [ ] Report uses the skill's PASS/FAIL markdown schema
- [ ] FAIL includes field-coverage / template-placeholder issues; no speculative UX review

## Execution

```yaml
kind: {{KIND}}
type: {{TYPE}}
target: {{TARGET}}
skills:
  - name: {{SKILL_NAME}}
    params:
      entity: {{ENTITY}}
      transport: {{TRANSPORT}}
```

## Notes

[fill] List/create/update components must already exist under `src/features/{{entity}}/`.
