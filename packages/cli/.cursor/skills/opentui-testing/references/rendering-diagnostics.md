# Rendering diagnostics

Choose the diagnostic that matches the question. Do not compare values as if they shared one unit.

| Question | Diagnostic |
|----------|------------|
| Expected text drawn? | `captureCharFrame()` or `captureSpans()` |
| Scheduled render work remains? | `renderer.getSchedulerState()` |
| Render pass completed? | renderer `frame` event |
| How many native frames? | `renderer.getNativeStats().nativeFrameCount` |
| Latest frame changed cells? | `renderer.getNativeStats().cellsUpdated` |
| JS timing samples? | `renderer.getStats()` with `gatherStats: true` |
| Marker first draw? | `TimeToFirstDrawRenderable.runtimeMs` |
| App logs? | Console overlay |

## Scheduler state

| Field | Meaning |
|-------|---------|
| `isRunning` | Continuous/live render loop active |
| `isRendering` | Loop pass active |
| `hasScheduledRender` | Timer, one-shot, or immediate rerender pending |

`renderer.idle()` waits for these (and feed-idle retries). Resolves after destruction. Does **not** require zero `cellsUpdated`.

## Native stats

| Field | Meaning |
|-------|---------|
| `nativeFrameCount` | Native frames completed |
| `cellsUpdated` | Changed diff cells in latest native frame |
| `averageCellsUpdated` | Average across retained samples |
| `nativeLastFrameTime` / `nativeAverageFrameTime` | µs between frames |
| `nativeRenderTime` / `nativeStdoutWriteTime` | µs when available |

An unchanged frame can increment `nativeFrameCount` while `cellsUpdated` is 0.

## Test helpers

```ts
await setup.waitForFrame((frame) => frame.includes("Ready"))
console.log(setup.captureCharFrame())
console.log(setup.captureSpans())
console.log(setup.getNativeStats())
await setup.waitForVisualIdle()
```

`renderer.frameId` is a monotonic JS loop id (increments even on failed/skipped/backpressured attempts). Treat `frame` event payload as an identifier, not elapsed time or cell count.

## Related

`--topic waiting`, `--topic capture`, `--topic env-diagnostics`
