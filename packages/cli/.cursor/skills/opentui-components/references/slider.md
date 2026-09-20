# Slider

Continuous value via draggable horizontal or vertical thumb. Use Select for discrete choices. **Core only** — no React/Solid element.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | SliderRenderable |
| React | Unavailable |
| Solid | Unavailable |
| Status | Built-in Core renderable |

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| orientation | `"vertical"` \| `"horizontal"` | **required** | Direction |
| value | number | `min` | Current value |
| min | number | `0` | Minimum |
| max | number | `100` | Maximum |
| viewPortSize | number | `max(1, (max-min)*0.1)` | Thumb size calc |
| backgroundColor | ColorInput | `#252527` | Track |
| foregroundColor | ColorInput | `#9a9ea3` | Thumb |
| onChange | `(value: number) => void` | - | On value change |

## Related

`--topic scrollbar`, `--topic select`, `--asset slider-basic`
