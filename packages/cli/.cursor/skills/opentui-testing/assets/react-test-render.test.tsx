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
