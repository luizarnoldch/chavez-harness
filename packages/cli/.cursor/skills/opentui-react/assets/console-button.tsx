import { BoxRenderable, createCliRenderer, type BoxOptions, type RenderContext } from "@opentui/core"
import { createRoot, extend } from "@opentui/react"

class ConsoleButtonRenderable extends BoxRenderable {
  private _label: string = "Button"

  constructor(ctx: RenderContext, options: BoxOptions & { label?: string }) {
    super(ctx, options)
    if (options.label) this._label = options.label
    this.borderStyle = "single"
    this.padding = 2
  }

  get label(): string {
    return this._label
  }

  set label(value: string) {
    this._label = value
    this.requestRender()
  }
}

declare module "@opentui/react" {
  interface OpenTUIComponents {
    consoleButton: typeof ConsoleButtonRenderable
  }
}

extend({ consoleButton: ConsoleButtonRenderable })

function App() {
  return <consoleButton label="Click me!" style={{ border: true, backgroundColor: "green" }} />
}

const renderer = await createCliRenderer()
createRoot(renderer).render(<App />)
