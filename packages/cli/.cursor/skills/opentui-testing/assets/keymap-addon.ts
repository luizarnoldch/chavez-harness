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
