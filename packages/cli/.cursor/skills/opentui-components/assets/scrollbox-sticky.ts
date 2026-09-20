import { ScrollBoxRenderable, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer()

const scrollbox = new ScrollBoxRenderable(renderer, {
  id: "logs",
  width: 60,
  height: 20,
  stickyScroll: true,
  stickyStart: "bottom",
  scrollbarOptions: {
    showArrows: true,
    trackOptions: {
      foregroundColor: "#7aa2f7",
      backgroundColor: "#414868",
    },
  },
})

renderer.root.add(scrollbox)
