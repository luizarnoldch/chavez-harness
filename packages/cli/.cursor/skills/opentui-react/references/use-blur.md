# useBlur(handler)

Subscribe to terminal window blur events.

```tsx
import { useBlur } from "@opentui/react"

function App() {
  useBlur(() => {
    console.log("Terminal lost focus")
  })

  return <text>Blur-aware component</text>
}
```
