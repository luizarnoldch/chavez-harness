# Select

Discrete choices in a vertical list. Use TabSelect for horizontal peers or Slider for continuous values. Focus to enable keyboard.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | SelectRenderable |
| React | `<select>` (automatic) |
| Solid | `<select>` (automatic) |
| Status | Built in |

## Option shape

```ts
interface SelectOption {
  name: string
  description: string
  value?: any
}
```

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| options | SelectOption[] | `[]` | Choices |
| selectedIndex | number | `0` | Initial index |
| showDescription | boolean | `true` | Show descriptions |
| showScrollIndicator | boolean | `false` | Scroll marker |
| showSelectionIndicator | boolean | `true` | Selection gutter |
| wrapSelection | boolean | `false` | Wrap at ends |
| itemSpacing | number | `0` | Between items |
| fastScrollStep | number | `5` | Shift+Up/Down skip |
| selectedBackgroundColor / selectedTextColor | colors | `#334455` / `#FFFF00` | Selected row |
| descriptionColor / selectedDescriptionColor | colors | `#888888` / `#CCCCCC` | Descriptions |

## Keys

Up/k, Down/j, Shift+Up/Down (fast), Enter to select.

## Events (`SelectRenderableEvents`)

| Event | When |
|-------|------|
| ITEM_SELECTED | Enter on an option (always has option) |
| SELECTION_CHANGED | After movement or valid `setSelectedIndex`; option may be `null` if empty; can fire when index unchanged |

## Programmatic

`getSelectedIndex()`, `getSelectedOption()`, `setSelectedIndex(n)`, `moveUp(n?)`, `moveDown(n?)`, `selectCurrent()`, assign `options`.

## Related

`--topic tab-select`, `--topic slider`, `--asset select-menu`
