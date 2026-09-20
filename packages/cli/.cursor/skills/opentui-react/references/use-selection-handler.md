# useSelectionHandler(handler)

Handle text selection events such as mouse drag selection.

```tsx
import { useSelectionHandler } from "@opentui/react"

function App() {
  useSelectionHandler((selection) => {
    const text = selection.getSelectedText()
    console.log("Selected:", text)
  })

  return <text selectable>Select this text with your mouse</text>
}
```
