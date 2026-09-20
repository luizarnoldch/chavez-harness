# Line number gutter

Adds a gutter to a renderable that supplies line info. Use with Code or an editor. Diff manages its own gutters.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | LineNumberRenderable |
| React | `<line-number>` (automatic) |
| Solid | `<line_number>` runtime built-in; exact props typing missing |
| Status | Built in with Solid typing limitation |

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| target | Renderable & LineInfoProvider | - | Numbered target |
| fg / bg | string \| RGBA | `#888888` / transparent | Gutter colors |
| minWidth | number | `3` | Min gutter width |
| paddingRight | number | `1` | Right pad |
| lineNumberOffset | number | `0` | Numbering offset |
| showLineNumbers | boolean | `true` | Toggle visibility |

## Methods

`setLineColor(n, color | { gutter, content })`, `clearLineColor`, `setLineSign`, `clearLineSign`, `setLineNumbers`, `setHideLineNumbers`.

Shorthand color → gutter bg; content bg = same color darkened 20%.

## Gotchas

Constructor currently **ignores** `showLineNumbers` option — set `lineNumbers.showLineNumbers = false` after construction to hide initially.

## Related

`--topic code`, `--topic diff`, `--asset line-number-code`
