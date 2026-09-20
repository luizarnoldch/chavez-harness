# TestRecorder

Listens to renderer frame events. Captures the character buffer after each completed render pass.

```ts
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
```

## API

| Method / property | Behavior |
|-------------------|----------|
| `rec()` | Start recording; clears frames; resets numbering; records start timestamp. Second `rec()` while active is a no-op |
| `stop()` | Detach listener |
| `clear()` | Empty frames; reset numbering |
| `recordedFrames` | Array copy |
| `isRecording` | Current state |

Each `RecordedFrame` has `frame`, elapsed timestamp from `rec()`, zero-based `frameNumber`, and optional copied buffers. Constructor options: `recordBuffers: { fg?, bg?, attributes? }`, injectable `now()`.

Call `stop()` during teardown **before** destroying the renderer.

## Related

`--asset test-recorder`, `--topic capture`
