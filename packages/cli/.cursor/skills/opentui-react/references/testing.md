# Testing

`@opentui/react/test-utils` exports `testRender(node, options)`. It is a React-aware wrapper around `createTestRenderer()`. It mounts the initial node with React `act()` and returns the Core `TestRendererSetup`. Renderer destruction unmounts the React root with `act()`.

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

The options argument is required and uses `TestRendererOptions`. The helper enables React’s act-environment flag for the mounted test root. Renderer destruction unmounts the root, calls `options.onDestroy` when supplied, and then sets the flag to false. The helper does not preserve a previous global value. If `onDestroy` throws, it prevents the final flag reset.

`testRender()` does not return the React root or a separate rerender function. Use the returned Core setup for frame capture, waits, resize, keyboard and mouse input, native stats, and external output. Always destroy the renderer in test teardown. Destruction unmounts the React tree and resets the global act-environment flag.
