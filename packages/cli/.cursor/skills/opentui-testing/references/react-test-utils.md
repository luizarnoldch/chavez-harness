# React test-utils

`@opentui/react/test-utils` exports `testRender(node, options)`. React-aware wrapper around `createTestRenderer()`. Mounts with React `act()` and returns the Core `TestRendererSetup`. Renderer destruction unmounts the React root with `act()`.

```tsx
import { expect, test } from "bun:test"
import { testRender } from "@opentui/react/test-utils"

function App() {
  return <text>Ready</text>
}

test("renders the application", async () => {
  const setup = await testRender(<App />, { width: 20, height: 4 })

  try {
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("Ready")
  } finally {
    setup.renderer.destroy()
  }
})
```

## Rules

- `options` is **required** (`TestRendererOptions`).
- Enables React’s act-environment flag for the mounted test root.
- Destruction unmounts the root, calls `options.onDestroy` when supplied, then sets the flag to `false`. Does not preserve a previous global value. If `onDestroy` throws, final flag reset is skipped.
- Does **not** return the React root or a separate rerender function.
- Use Core setup for frame capture, waits, resize, keyboard/mouse, native stats, external output.
- Always destroy in teardown.

For React bindings and hooks outside tests, use the `opentui-react` skill.

## Related

`--asset react-test-render`, `--topic create-test-renderer`, `--topic solid-test-utils`
