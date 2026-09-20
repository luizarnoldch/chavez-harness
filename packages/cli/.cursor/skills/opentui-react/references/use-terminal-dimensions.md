# useTerminalDimensions()

Get reactive terminal dimensions.

```tsx
import { useTerminalDimensions } from "@opentui/react"

function App() {
  const { width, height } = useTerminalDimensions()

  return (
    <text>
      Terminal: {width}x{height}
    </text>
  )
}
```
