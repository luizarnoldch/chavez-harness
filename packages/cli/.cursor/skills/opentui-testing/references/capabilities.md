# Capabilities

Build a complete `TerminalCapabilities` fixture with partial overrides:

```ts
import {
  createTerminalCapabilities,
  createTestRenderer,
  setRendererCapabilities,
} from "@opentui/core/testing"

const capabilities = createTerminalCapabilities({
  rgb: true,
  kitty_keyboard: true,
  terminal: { name: "test-terminal", version: "1" },
})

const setup = await createTestRenderer({ width: 20, height: 4 })

try {
  setRendererCapabilities(setup.renderer, capabilities)
} finally {
  setup.renderer.destroy()
}
```

Baseline disables feature booleans. Defaults: `unicode: "unicode"`, `osc52_support: "unknown"`, `multiplexer: "none"`, `image_protocol: "auto"`, `remote: false`. Terminal name/version empty; `from_xtversion` false.

`setRendererCapabilities(renderer, overrides?)` builds a complete fixture, replaces the renderer’s test capability state, and returns the fixture.

## Related

`--topic create-test-renderer`
