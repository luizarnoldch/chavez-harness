# usePaste(handler)

Handle terminal paste events (bracketed paste).

```tsx
import { decodePasteBytes } from "@opentui/core"
import { usePaste } from "@opentui/react"

function App() {
  usePaste((event) => {
    const text = decodePasteBytes(event.bytes)
    console.log("Pasted text:", text)
  })

  return <text>Paste something into the terminal</text>
}
```
