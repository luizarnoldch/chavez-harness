import { ScrollBarRenderable, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer()

const scrollbar = new ScrollBarRenderable(renderer, {
  id: "scrollbar",
  orientation: "vertical",
  height: 10,
  showArrows: true,
  trackOptions: {
    backgroundColor: "#222222",
    foregroundColor: "#888888",
  },
  onChange: (position) => {
    console.log("Scroll position:", position)
  },
})

scrollbar.scrollSize = 200
scrollbar.viewportSize = 20
scrollbar.scrollPosition = 0

renderer.root.add(scrollbar)
scrollbar.focus()
