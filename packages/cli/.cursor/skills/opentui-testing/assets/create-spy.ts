const { createSpy } = await import("@opentui/core/testing")

const spy = createSpy()
spy("saved", 3)

console.log(spy.calls)
console.log(spy.callCount())
console.log(spy.calledWith("saved", 3))
spy.reset()
