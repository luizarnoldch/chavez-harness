# Waiting

Use `renderOnce()` for an explicitly controlled pass. Use `waitForFrame()` when application work schedules rendering asynchronously.

```ts
const setup = await createTestRenderer({ width: 30, height: 5 })

try {
  setup.renderer.root.add(new TextRenderable(setup.renderer, { content: "Ready" }))
  const frame = await setup.waitForFrame((value) => value.includes("Ready"))
  console.log(frame)
} finally {
  setup.renderer.destroy()
}
```

## Bounds

Wait limit options accept numbers. Missing, nonnumeric, non-finite, and non-positive values use defaults. Other values are floored (so `0 < n < 1` becomes `0`).

| Helper | Options | Default bound |
|--------|---------|---------------|
| `flush()` | `{ maxPasses }` | 20 frames |
| `waitFor()` | `{ maxPasses }` | 20 waits |
| `waitForFrame()` | `{ maxPasses }` | 20 waits |
| `waitForVisualIdle()` | `{ quietFrames, maxFrames }` | 1, 20 |

`waitFor()` and `waitForFrame()` check current state before the first wait (up to `maxPasses + 1` evaluations). They stop early when the scheduler has no work.

`waitForVisualIdle()` drains promise and `process.nextTick` work before each check. Returns when the scheduler has no running, rendering, or scheduled work; otherwise requires `quietFrames` consecutive frames with `cellsUpdated === 0`. A changed frame resets the quiet-frame count.

These are **frame/scheduler bounds**, not wall-clock timeouts. Advance `ManualClock` when the renderer uses one, or waits can hang.

## Exhaustion errors

Report `frameId`, `nativeFrameCount`, `cellsUpdated`, `isRunning`, `isRendering`, `hasScheduledRender`. `waitForFrame()` also reports the last captured frame. See `--topic rendering-diagnostics`.

## Related

`--asset wait-for-frame`, `--topic manual-clock`, `--topic create-test-renderer`
