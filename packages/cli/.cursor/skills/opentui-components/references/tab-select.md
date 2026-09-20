# TabSelect

Horizontal tab strip; scrolls as selection moves. Use Select for a vertical list. Focus for keyboard.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | TabSelectRenderable |
| React | `<tab-select>` (automatic) |
| Solid | `<tab_select>` (automatic) |
| Status | Built in |

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| width | number | - | Total width |
| options | TabSelectOption[] | `[]` | Tabs |
| tabWidth | number | `20` | Width per tab |
| showScrollArrows | boolean | `true` | Scroll indicators |
| showDescription | boolean | `true` | Description under strip |
| showUnderline | boolean | `true` | Underline selected |
| wrapSelection | boolean | `false` | Wrap navigation |
| keyBindings / keyAliasMap | - | - | Custom keys |
| selected* / focused* colors | colors | see docs | Styling |

Omitted focused colors copy base; if both omitted, focused bg `#1a1a1a`, focused text `#FFFFFF`.

## Keys

Left/`[`, Right/`]`, Enter to select.

## Events (`TabSelectRenderableEvents`)

| Event | When |
|-------|------|
| ITEM_SELECTED | Enter on a tab |
| SELECTION_CHANGED | After successful move or valid `setSelectedIndex` (even same index); blocked move does not emit |

## Programmatic

`getSelectedIndex()`, `setSelectedIndex(n)`, `setOptions([...])`.

## Related

`--topic select`, `--topic scrollbox`, `--asset tab-select-panels`
