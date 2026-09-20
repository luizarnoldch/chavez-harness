# createTestRenderer

```ts
import { createTestRenderer } from "@opentui/core/testing"
import { TextRenderable } from "@opentui/core"

const setup = await createTestRenderer({ width: 40, height: 10 })

try {
  setup.renderer.root.add(new TextRenderable(setup.renderer, { content: "Hello" }))
  await setup.renderOnce()
  console.log(setup.captureCharFrame())
} finally {
  setup.renderer.destroy()
}
```

`createTestRenderer(options)` requires an options object. `TestRendererOptions` extends `CliRendererConfig` and adds `width`, `height`, `kittyKeyboard`, and `otherModifiersMode`.

## Setup semantics

Constructs `CliRenderer` directly. Does **not** call `createCliRenderer()` or `setupTerminal()`. Default mock stdin has no `setRawMode()`, so host raw mode is unchanged. Creates the native renderer and applies normal thread defaults.

| Setting | Test default |
|---------|--------------|
| `screenMode` | `"main-screen"` |
| `footerHeight` | `12` |
| `consoleMode` | `"disabled"` |
| `externalOutputMode` | `"passthrough"` |
| `bufferedOutput` | `"memory"` |
| `width` | `options.width` → custom stdout.columns → host → `80` |
| `height` | `options.height` → custom stdout.rows → host → `24` |

Legacy `kittyKeyboard: true` maps to `useKittyKeyboard: { events: true }`. `otherModifiersMode` enables modifyOtherKeys-style sequences only when Kitty mode is off.

Tests own cleanup. Always call `setup.renderer.destroy()` in `finally` or teardown. Use `createCliRenderer()` with custom streams only when exercising real output transport. Test renderer defaults to native memory output even when you supply stream objects.

## Returned setup

| Member | Behavior |
|--------|----------|
| `renderer` | `CliRenderer` instance (`TestRenderer` type alias) |
| `mockInput` | Keyboard driver from `createMockKeys()` |
| `mockMouse` | SGR mouse driver from `createMockMouse()` |
| `renderOnce()` | Wait for feed backpressure if present, then one loop pass |
| `flush(options?)` | `waitForVisualIdle()` with `maxPasses` (default 20) |
| `waitFor(predicate, options?)` | Check sync/async predicate while rendering can progress |
| `waitForFrame(predicate, options?)` | Check captured text; return matching frame |
| `waitForVisualIdle(options?)` | No scheduled work or consecutive zero-cell-update frames |
| `captureCharFrame()` | Decode character buffer as text |
| `captureSpans()` | `{ cols, rows, cursor: [x, y], lines }` with styled spans |
| `externalOutput` | Recorder for split-footer external-output commits |
| `getNativeStats()` | Current native render stats |
| `resize(width, height)` | Test resize path |

`renderOnce()` always starts one loop pass, even with no pending work. Wait helpers do not force a frame.

## Related

`--asset hello-renderer`, `--topic waiting`, `--topic capture`
