import { createTestRenderer } from "@opentui/core/testing"

const setup = await createTestRenderer({ width: 40, height: 10 })

try {
  await setup.mockMouse.click(4, 2)
  await setup.mockMouse.drag(4, 2, 20, 6)
  await setup.mockMouse.scroll(20, 6, "down")
  console.log(setup.mockMouse.getCurrentPosition())
  console.log(setup.mockMouse.getPressedButtons())
} finally {
  setup.renderer.destroy()
}
