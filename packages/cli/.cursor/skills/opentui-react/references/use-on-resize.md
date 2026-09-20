# useOnResize(callback)

Handle terminal resize events.

```tsx
import { useOnResize } from "@opentui/react"

function App() {
  useOnResize((width, height) => {
    console.log(`Resized to ${width}x${height}`)
  })

  return <text>Resize-aware component</text>
}
```
