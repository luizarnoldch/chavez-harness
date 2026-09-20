# ASCIIFont

Short text with bundled ASCII art fonts. Use Text for normal labels and prose.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | ASCIIFontRenderable |
| React | `<ascii-font>` (automatic) |
| Solid | `<ascii_font>` (automatic) |
| Status | Built in |

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| text | string | `""` | Content |
| font | ASCIIFontName | `"tiny"` | Font style |
| color | ColorInput \| ColorInput[] | `#FFFFFF` | Color or bands |
| backgroundColor | ColorInput | transparent | Background |
| selectable / selectionBg / selectionFg | - | selectable true | Selection |
| position / left / top / right / bottom | layout | relative | Positioning |

## Fonts

`"tiny"`, `"block"`, `"shade"`, `"slick"`, `"huge"`, `"grid"`, `"pallet"`.

Update dynamically via `fontRenderable.text = "..."`.

## Related

`--topic text`, `--topic framebuffer`, `--asset ascii-font-welcome`
