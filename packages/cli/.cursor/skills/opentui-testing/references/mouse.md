# Mouse

`mockMouse` emits SGR mouse sequences through renderer stdin. Coordinates are **zero-based**. Use `createMockMouse(renderer)` with an existing renderer.

```ts
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
```

## Operations

`moveTo`, `click`, `doubleClick`, `pressDown`, `release`, `drag`, `scroll`, `getCurrentPosition`, `getPressedButtons`, and low-level `emitMouseEvent`.

Click, double-click, and drag use `delayMs: 10` by default. Drag emits five interpolated movement events. Other operations default to no delay.

`MouseButtons`: `LEFT` (0), `MIDDLE` (1), `RIGHT` (2), wheel `WHEEL_UP`–`WHEEL_RIGHT` (64–67). Modifiers: `shift`, `alt`, `ctrl`.

## Related

`--asset mouse-click`, `--topic keyboard`
