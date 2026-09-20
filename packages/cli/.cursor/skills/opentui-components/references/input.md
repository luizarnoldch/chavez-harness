# Input

Edits one line of text with cursor, placeholder, and focus styles. Use Textarea for multi-line. Focus the input to receive keyboard input.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | InputRenderable |
| React | `<input>` (automatic) |
| Solid | `<input>` (automatic) |
| Status | Built in |

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| width | number \| `"auto"` \| `%` | `"auto"` | Field width |
| value | string | `""` | Current text |
| placeholder | string | `""` | When empty |
| minLength | number | `0` | UTF-16 units required for submit |
| maxLength | number | `1000` | Max UTF-16 units |
| backgroundColor | string \| RGBA | transparent | Unfocused bg |
| focusedBackgroundColor | string \| RGBA | backgroundColor | Focused bg |
| textColor / cursorColor | string \| RGBA | `#FFFFFF` | Colors |

## Events (`InputRenderableEvents`)

| Event | When |
|-------|------|
| INPUT | After insert/delete or assigning a different value |
| CHANGE | On blur or successful `submit()` when value differs from baseline |
| ENTER | Enter/Return submit succeeds; blocked if length &lt; minLength |

Each `focus()` sets the CHANGE baseline; each CHANGE updates it.

## API

- Read: `input.value`
- Write: `input.value = "..."`
- Focus: `input.focus()`

## Gotchas

- No password-masking mode — do not use Input for real secrets as plain text.
- Length limits are UTF-16 code units, not graphemes/display cells.

## Related

`--topic textarea`, `--asset input-login`
