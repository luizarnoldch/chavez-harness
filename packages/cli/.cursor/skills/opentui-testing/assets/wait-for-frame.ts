import { TextRenderable } from "@opentui/core"
import { createTestRenderer } from "@opentui/core/testing"

const setup = await createTestRenderer({ width: 30, height: 5 })

try {
  setup.renderer.root.add(new TextRenderable(setup.renderer, { content: "Ready" }))
  const frame = await setup.waitForFrame((value) => value.includes("Ready"))
  console.log(frame)
} finally {
  setup.renderer.destroy()
}
