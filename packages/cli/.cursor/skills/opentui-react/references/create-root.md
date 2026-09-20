# createRoot(renderer)

`createRoot(renderer)` adopts an existing CliRenderer. It returns a React root with `render(node)` and `unmount()`.

```tsx
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"

function App() {
  return <text>Hello, React!</text>
}

const renderer = await createCliRenderer()
const root = createRoot(renderer)
root.render(<App />)
```

For plugin slots, see Plugin slots and React plugin slots.
