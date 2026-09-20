# Textarea

Multi-line editing with cursor, selection, and configurable key bindings. Use Input for a single line.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | TextareaRenderable |
| React | `<textarea>` (automatic) |
| Solid | `<textarea>` (automatic) |
| Status | Built in |

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| width / height | number \| string | - | Size |
| initialValue | string | `""` | Initial content |
| placeholder | string \| StyledText \| null | `null` | Placeholder |
| placeholderColor | string \| RGBA | `#666666` | Placeholder color |
| backgroundColor / textColor | string \| RGBA | transparent / `#FFFFFF` | Unfocused |
| focusedBackgroundColor / focusedTextColor | string \| RGBA | copies base | Focused |
| wrapMode | `"none"` \| `"char"` \| `"word"` | `"word"` | Wrapping |
| selectionBg / selectionFg | string \| RGBA | - | Selection colors |
| cursorColor | string \| RGBA | `#FFFFFF` | Cursor |
| selectionOccupancy | `"cell"` \| `"boundary"` | `"cell"` | Selection extent |
| keyBindings / keyAliasMap | arrays/maps | - | Custom keys |
| onSubmit / onContentChange / onCursorChange | handlers | - | Events |

Omitted focused colors copy base; if both omitted, focused bg is transparent and focused text is `#FFFFFF`.

## Useful getters

`plainText`, `cursorOffset`, `cursorCharacterOffset` (unreliable after wide graphemes), `logicalCursor`, `visualCursor`, `traits`.

## Cursor / selection / edit

Movement methods accept `{ select: true }` to extend selection. Examples: `setCursor`, `moveCursorLeft/Right/Up/Down`, `moveWordForward/Backward`, `gotoLine*`, `setSelection`, `selectAll`, `insertText`, `deleteChar`, `undo`/`redo`.

Default occupancy `cell`: first shift+right selects two cells. With bar cursor (`cursorStyle: { style: "line" }`), also set `selectionOccupancy: "boundary"`.

## Traits

```ts
textarea.traits = { capture: ["escape", "submit"], suspend: false, status: "Composing" }
```

`capture`: `"escape"` \| `"navigate"` \| `"submit"` \| `"tab"`. Emits `TRAITS_CHANGED`. Resets on destroy.

## Related

`--topic input`, `--asset textarea-submit`
