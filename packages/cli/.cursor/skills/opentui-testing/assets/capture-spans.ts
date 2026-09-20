import { TextRenderable } from "@opentui/core"
import { createTestRenderer } from "@opentui/core/testing"

const setup = await createTestRenderer({ width: 20, height: 4 })

try {
  setup.renderer.root.add(
    new TextRenderable(setup.renderer, { content: "Status", fg: "#22c55e" }),
  )
  await setup.renderOnce()
  const captured = setup.captureSpans()
  console.log(captured.cols, captured.rows, captured.cursor, captured.lines)
} finally {
  setup.renderer.destroy()
}
