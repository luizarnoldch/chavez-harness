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

[fill] Review backend scaffold for {{ENTITY}} ({{TRANSPORT}} / {{DATABASE}}). Read-only.

## Goal

Run `{{SKILL_NAME}}` against `{{TARGET}}` and report PASS/FAIL from `validate.sh`. Do not write code.

## Acceptance criteria

- [ ] Validator ran with Execution params
- [ ] Report uses the skill's PASS/FAIL markdown schema
- [ ] FAIL includes required fixes per layer; no speculative style comments

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
      database: {{DATABASE}}
```

## Notes

[fill] Scaffold must already exist under `src/features/{{entity}}/`.
