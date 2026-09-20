import { ImageRenderable, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer()
const image = new ImageRenderable(renderer, {
  id: "cover",
  source: "./cover.webp",
  width: 40,
  height: 15,
  fit: "cover",
  protocol: "auto",
  onError: console.error,
})

renderer.root.add(image)
await image.loadPromise
