# ScrollBox

Scrolls arbitrary child renderables and owns ScrollBar instances. Use standalone ScrollBar only when another model owns scroll position.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | ScrollBoxRenderable |
| React | `<scrollbox>` (automatic) |
| Solid | `<scrollbox>` (automatic) |
| Status | Built in |

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| scrollX | boolean | `false` | Horizontal scroll |
| scrollY | boolean | `true` | Vertical scroll |
| stickyScroll | boolean | `false` | Pin to edge |
| stickyStart | `"top"` \| `"bottom"` \| `"left"` \| `"right"` | - | **Required** when sticky; no default |
| viewportCulling | boolean | `true` | Skip offscreen children |
| rootOptions / wrapperOptions / viewportOptions / contentOptions | BoxOptions | - | Style sub-boxes |
| scrollbarOptions | ScrollBarOptions | - | Both bars |
| verticalScrollbarOptions / horizontalScrollbarOptions | ScrollBarOptions | - | Per-axis |

## Read/write scroll state

`scrollTop`, `scrollLeft` (get/set); `scrollWidth`, `scrollHeight` (read-only).

## Methods

- `scrollBy(n)` / `scrollBy({ x, y })` / `scrollBy(1, "viewport")`
- `scrollTo(0)` / `scrollTo({ x, y })`
- `scrollChildIntoView(id)` — DOM-style nearest; no-op if already visible

## Keyboard (when focused)

Arrows: 1/5 viewport; Page Up/Down: 1/2 vertical; Home/End: start/end.

## Gotchas

- Set **both** `stickyScroll` and `stickyStart`.
- Viewport culling skips `renderBefore`/`renderAfter` for offscreen children — do not put layout/state in those hooks.
- Internals: `wrapper`, `viewport`, `content`, `horizontalScrollBar`, `verticalScrollBar`.

## Related

`--topic scrollbar`, `--topic box`, `--asset scrollbox-sticky`
