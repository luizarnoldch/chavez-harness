# Diff

One file patch in unified or split view with syntax highlighting and optional line numbers. Use Code when you do not need patch parsing.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | DiffRenderable |
| React | `<diff>` (automatic) |
| Solid | `<diff>` runtime built-in; exact props typing missing |
| Status | Built in with Solid typing limitation |

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| diff | string | `""` | Unified diff string |
| view | `"unified"` \| `"split"` | `"unified"` | Layout |
| syncScroll | boolean | `false` | Link panes in split (no-op unified) |
| filetype | string | - | Highlight language |
| syntaxStyle | SyntaxStyle | - | Code style |
| showLineNumbers | boolean | `true` | Gutters |
| addedBg / removedBg / contextBg | colors | greens/reds/transparent | Line backgrounds |
| addedSignColor / removedSignColor | colors | `#22c55e` / `#ef4444` | Signs |
| wrapMode / conceal / selection* | - | - | Inherited code options |

## Gotchas

For multi-file input, Diff displays only `patches[0]`. Create **one DiffRenderable per file patch**.

## Related

`--topic code`, `--topic line-number`, `--asset diff-split`
