# ScrollBar

Controls a scroll position with optional arrows, keyboard, and draggable thumb. Use ScrollBox when the component must also own and clip scrollable children. **Core only**.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | ScrollBarRenderable |
| React | Unavailable |
| Solid | Unavailable |
| Status | Built-in Core renderable |

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| orientation | `"vertical"` \| `"horizontal"` | - | Direction |
| showArrows | boolean | `false` | Arrow buttons |
| arrowOptions | ArrowOptions | - | Arrow styling |
| trackOptions | Partial`<SliderOptions>` | - | Track/thumb styling |
| scrollSize | number | `0` | Total scrollable size |
| viewportSize | number | `0` | Visible size |
| scrollPosition | number | `0` | Current position |
| scrollStep | number | - | Step for `scrollBy(..., "step")` |
| onChange | `(position: number) => void` | - | Position changed |

## Keys (focused)

Vertical: Up/Down or k/j; horizontal: Left/Right or h/l; PageUp/PageDown; Home/End.

## Related

`--topic scrollbox`, `--topic slider`, `--asset scrollbar-basic`
