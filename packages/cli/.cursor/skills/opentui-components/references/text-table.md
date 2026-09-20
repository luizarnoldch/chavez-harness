# TextTable

Two-dimensional array of styled text cells. Use Markdown when the table starts as Markdown source. **Core only**.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | TextTableRenderable |
| React | Unavailable |
| Solid | Unavailable |
| Status | Built-in Core renderable |

## Content types

```ts
type TextTableCellContent = TextChunk[] | null | undefined
type TextTableContent = TextTableCellContent[][]
```

Build cells with `bold()`, `fg()`, `bg()`, or `{ __isChunk: true, text }`. First row is not special — header is a convention. Rows may differ in length; longest row sets column count.

## Key options

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| content | TextTableContent | `[]` | Cell data |
| wrapMode | `"none"` \| `"char"` \| `"word"` | `"word"` | Cell wrap |
| columnWidthMode | `"content"` \| `"full"` | `"full"` | Intrinsic vs fill |
| columnFitter | `"proportional"` \| `"balanced"` | `"proportional"` | Shrink allocation |
| cellPadding / X / Y | number | `0` | Padding |
| columnGap | number | `0` | When inner vertical borders off |
| border / outerBorder | boolean | true / follows border | Separators vs boundary |
| showBorders | boolean | `true` | Paint glyphs (space still reserved) |
| borderStyle | style | `"single"` | Glyph set |
| selectable | boolean | `true` | Cell selection |

Always uses a buffered surface. Mutable: content, wrap*, column*, cellPadding*, columnGap, showBorders, border, outerBorder, borderStyle, borderColor.

## Selection

Starts in cell content only (not borders). `getSelectedText()` joins nonempty cells with tabs, rows with newlines.

## Related

`--topic markdown`, `--asset text-table-basic`
