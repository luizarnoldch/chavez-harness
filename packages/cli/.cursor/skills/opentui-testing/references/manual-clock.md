# ManualClock

Implements OpenTUI’s clock interface without wall-clock waits. Starts at zero. Supports `now`, `setTime`, timeout/interval scheduling, clearing, `advance`, and `runAll`.

```ts
const { ManualClock } = await import("@opentui/core/testing")

const clock = new ManualClock()
let fired = false

clock.setTimeout(() => {
  fired = true
}, 100)

clock.advance(99)
console.log(fired) // false
clock.advance(1)
console.log(fired) // true
```

Times and delays are floored. Negative delays advance by zero. Timers at one timestamp fire in registration order. `setTime()` runs due timers when time moves forward; changes time directly when moving backward.

Use `runAll()` only for finite work — an active interval keeps scheduling work.

When the renderer uses `ManualClock`, advance it in the test or `waitFor*` helpers can hang (frame/scheduler bounds, not wall-clock).

## Related

`--asset manual-clock`, `--topic waiting`
