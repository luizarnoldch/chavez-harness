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
