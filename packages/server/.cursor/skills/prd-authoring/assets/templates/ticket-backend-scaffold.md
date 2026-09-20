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

[fill] Scaffold backend layers for {{ENTITY}} ({{LAYERS}} / {{TRANSPORT}} / {{DATABASE}}).

## Goal

Generate `src/features/{{entity}}/` via `{{SKILL_NAME}}` without hand-writing tRPC/Prisma/Drizzle files.

## Acceptance criteria

- [ ] CLI (or template fallback) ran with Execution params
- [ ] Requested layers exist under `src/features/{{entity}}/`
- [ ] No leftover `[Entity]` / `[entity]` placeholders in generated files

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

## Notes

[fill] Follow-up review is a separate `backend-review` ticket.
