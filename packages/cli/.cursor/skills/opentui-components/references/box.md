# Box

Lays out child renderables; can draw background, border, and title. Use ScrollBox when children must scroll.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | BoxRenderable |
| React | `<box>` (automatic) |
| Solid | `<box>` (automatic) |
| Status | Built in |

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| width / height | number \| string | - | Columns/rows or `%` |
| backgroundColor | string \| RGBA | transparent | Fill |
| border | boolean | `false` | Show border |
| borderStyle | string | `"single"` | `single` \| `double` \| `rounded` \| `heavy` |
| borderColor | string \| RGBA | `#FFFFFF` | Border color |
| title / bottomTitle | string | - | Border titles |
| titleColor | string \| RGBA | borderColor | Title color |
| titleAlignment / bottomTitleAlignment | string | `"left"` | `left` \| `center` \| `right` |
| padding | number | `0` | Internal padding |
| gap | number \| string | - | Gap between children |
| flexDirection | string | `"column"` | Flex direction |
| justifyContent | string | `"flex-start"` | Main axis |
| alignItems | string | `"stretch"` | Cross axis |

## Borders

- `border: false` — no border
- `border: true` — default style
- Or set `borderStyle` alone: `"single"`, `"double"`, `"rounded"`, `"heavy"`

## Mouse

Supports `onMouseDown`, `onMouseOver`, `onMouseOut`, etc. for interactive panels/buttons.

## Related

`--topic scrollbox`, `--topic text`, `--asset box-card`
