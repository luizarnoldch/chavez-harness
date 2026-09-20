# Keyboard

`createTestRenderer()` exposes its keyboard driver as `mockInput`. Use `createMockKeys(renderer, options?)` with an existing renderer.

```ts
import { InputRenderable } from "@opentui/core"
import { KeyCodes, createTestRenderer } from "@opentui/core/testing"

const setup = await createTestRenderer({ width: 30, height: 4 })

try {
  const input = new InputRenderable(setup.renderer, { width: 20 })
  setup.renderer.root.add(input)
  input.focus()

  await setup.mockInput.typeText("hello")
  setup.mockInput.pressKey(KeyCodes.ARROW_LEFT)
  setup.mockInput.pressBackspace()
  await setup.renderOnce()
} finally {
  setup.renderer.destroy()
}
```

## Methods

| Method | Behavior |
|--------|----------|
| `pressKey(key, modifiers?)` | Emit one key synchronously |
| `pressKeys(keys, delayMs = 0)` | Emit several raw keys, optionally delayed |
| `typeText(text, delayMs = 0)` | Emit each item from `text.split("")` |
| `pressEnter(modifiers?)` | Emit return |
| `pressEscape(modifiers?)` | Emit escape |
| `pressTab(modifiers?)` | Emit tab; Shift+Tab uses back-tab |
| `pressBackspace(modifiers?)` | Emit backspace |
| `pressArrow(direction, modifiers?)` | `"up"` \| `"down"` \| `"left"` \| `"right"` |
| `pressCtrlC()` | Emit Ctrl+C |
| `pasteBracketedText(text)` | Bracketed-paste start, content, end |

Modifiers: `shift`, `ctrl`, `meta`, `super`, `hyper`.

`KeyCodes` includes return, linefeed, tab, backspace, delete, home, end, escape, four arrows, and F1–F12. `KeyInput` accepts a raw string or a `KeyCodes` key name.

`typeText()` splits UTF-16 code units. Use a whole UTF-8 chunk or bracketed paste for multi-code-unit graphemes. `pasteBytes(text)` returns UTF-8 bytes without emitting them.

## Related

`--asset keyboard-input`, `--topic mouse`
