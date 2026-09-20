# createSpy

Returns a callable that records argument arrays:

```ts
const { createSpy } = await import("@opentui/core/testing")

const spy = createSpy()
spy("saved", 3)

console.log(spy.calls)
console.log(spy.callCount())
console.log(spy.calledWith("saved", 3))
spy.reset()
```

`calledWith()` compares recorded and expected argument arrays with `JSON.stringify`. Not a test-framework mock replacement.

## Related

`--asset create-spy`
