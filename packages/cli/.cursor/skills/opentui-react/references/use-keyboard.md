# useKeyboard(handler, options?)

Handle keyboard events.

```tsx
import { useKeyboard, useRenderer } from "@opentui/react"

function App() {
  const renderer = useRenderer()

  useKeyboard((key) => {
    if (key.name === "escape") {
      renderer.destroy()
    }
  })

  return <text>Press ESC to close</text>
}
```

To handle release events:

```tsx
useKeyboard(
  (event) => {
    if (event.eventType === "release") {
      console.log("Key released:", event.name)
    } else {
      console.log("Key pressed:", event.name)
    }
  },
  { release: true },
)
```
