# useRenderer()

Access the OpenTUI renderer instance.

```tsx
import { useRenderer } from "@opentui/react"
import { useEffect } from "react"

function App() {
  const renderer = useRenderer()

  useEffect(() => {
    renderer.console.show()
    console.log("Hello from console!")
  }, [])

  return <box />
}
```
