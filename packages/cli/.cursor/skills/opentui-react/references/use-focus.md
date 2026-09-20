# useFocus(handler)

Subscribe to terminal window focus events.

```tsx
import { useFocus } from "@opentui/react"

function App() {
  useFocus(() => {
    console.log("Terminal gained focus")
  })

  return <text>Focus-aware component</text>
}
```
