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
