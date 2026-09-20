# useTimeline(options?)

`useTimeline()` creates one Timeline for the mounted hook. It registers the timeline after mount and starts it unless `autoplay` is false. React pauses and unregisters the same instance during effect cleanup.

```tsx
import { useTimeline } from "@opentui/react"

function App() {
  const timeline = useTimeline({ autoplay: false })
  return <text>{timeline.isPlaying ? "Playing" : "Paused"}</text>
}
```

The hook reads its options when it creates the instance. Read Animation and Timeline for scheduling, callbacks, engine ownership, and cleanup.
