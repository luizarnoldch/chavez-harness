import { TextRenderable } from "@opentui/core"
import { TestRecorder, createTestRenderer } from "@opentui/core/testing"

const setup = await createTestRenderer({ width: 20, height: 4 })
const recorder = new TestRecorder(setup.renderer, {
  recordBuffers: { fg: true, attributes: true },
})

try {
  recorder.rec()
  setup.renderer.root.add(new TextRenderable(setup.renderer, { content: "Recorded" }))
  await setup.renderOnce()
  recorder.stop()
  console.log(recorder.recordedFrames)
} finally {
  recorder.stop()
  setup.renderer.destroy()
}
