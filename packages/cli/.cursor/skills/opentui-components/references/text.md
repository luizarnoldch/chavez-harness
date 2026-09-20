# Text

Styled text with colors, attributes, and selection. Use for labels and prose. Use Code or Markdown for parsed rich content.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | TextRenderable |
| React | `<text>` (automatic) |
| Solid | `<text>` (automatic) |
| Status | Built in |

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| content | string \| StyledText | `""` | Text to display |
| fg | string \| RGBA | `#FFFFFF` | Foreground |
| bg | string \| RGBA | transparent | Background |
| attributes | TextAttributes | `0` | Bitwise OR flags |
| selectable | boolean | `true` | Selection for copy |
| wrapMode | `"none"` \| `"char"` \| `"word"` | `"word"` | Line wrapping |
| textAlign | `"left"` \| `"center"` \| `"right"` | `"left"` | Per-line pad within width |
| position | `"relative"` \| `"absolute"` | `"relative"` | Positioning |

## Attributes

`TextAttributes.BOLD | DIM | ITALIC | UNDERLINE | BLINK | INVERSE | HIDDEN | STRIKETHROUGH`

## Template literals

```ts
import { t, bold, underline, fg, bg, italic } from "@opentui/core"
content: t`${bold("Important:")} ${fg("#FF0000")(underline("Warning!"))}`
```

Style helpers: `bold`, `dim`, `italic`, `underline`, `blink`, `reverse`, `strikethrough`, `fg`, `bg`.

React/Solid: compose `<span>`, `<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<br>`, `<a href>` **only inside** `<text>`. See `--topic inline-text`.

## Gotchas

- Wrapping runs first; then `textAlign` pads each rendered line.
- Alignment needs a width (or parent stretch); no effect if every line already fills width.
- `textAlign` does not replace Yoga box alignment.
- CodeRenderable inherits `textAlign`.

## Related

`--topic box`, `--topic code`, `--topic markdown`, `--asset text-status-bar`
