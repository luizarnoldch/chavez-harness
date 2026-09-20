# Keymap testing

`@opentui/keymap/testing` does not require a renderer.

```ts
import { createTestKeymap } from "@opentui/keymap/testing"

const harness = createTestKeymap({ defaultKeys: true })
const calls: string[] = []

try {
  harness.keymap.registerLayer({
    commands: [{ name: "save", run: () => calls.push("save") }],
    bindings: [{ key: "x", cmd: "save" }],
  })

  harness.host.press("x")
  console.log(calls)
  console.log(harness.diagnostics.takeErrors())
} finally {
  harness.cleanup()
}
```

The harness supplies a fake host, root target, focus/parent traversal, press/release, raw input, target destruction, and diagnostic capture.

## Addon tests

```ts
import { createTestKeymap } from "@opentui/keymap/testing"
import { registerMyAddon } from "./my-addon"

const { keymap, host, diagnostics, cleanup } = createTestKeymap({ defaultKeys: true })

try {
  const disposeAddon = registerMyAddon(keymap)
  const disposeLayer = keymap.registerLayer({
    commands: [{ name: "file.save", run() {} }],
    bindings: [{ key: "x", cmd: "file.save" }],
  })

  host.press("x")
  diagnostics.takeErrors()

  disposeLayer()
  disposeAddon()
} finally {
  cleanup()
}
```

Use `createTestKeymapHost()` when the test constructs `Keymap` itself. Use `captureKeymapDiagnostics()` when a test already owns a keymap.

## Observe

- Addon changes dispatch or query output as intended
- Disposer removes behavior and subscriptions
- Repeated registration follows ownership policy
- Callback failures emit expected diagnostic codes
- Target/host destruction releases retained resources
- Disposers remain safe before and after host destruction

Use an adapter-specific test only when the addon depends on HTML or OpenTUI behavior.

## Addon lifecycle (minimal)

An addon accepts a `Keymap`, registers via public methods, returns one disposer. Dispose in reverse setup order. Clean up completed setup if a later step throws. Use only public registration APIs.

## Related

`--asset keymap-addon`, `--topic strategy`
