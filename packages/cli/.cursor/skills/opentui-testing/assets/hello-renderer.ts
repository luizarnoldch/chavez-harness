import { TextRenderable } from "@opentui/core"
import { createTestRenderer } from "@opentui/core/testing"

const setup = await createTestRenderer({ width: 40, height: 10 })

try {
  setup.renderer.root.add(new TextRenderable(setup.renderer, { content: "Hello" }))
  await setup.renderOnce()
  console.log(setup.captureCharFrame())
} finally {
  setup.renderer.destroy()
}
