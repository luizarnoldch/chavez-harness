import { FrameBufferRenderable, RGBA, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer()

const canvas = new FrameBufferRenderable(renderer, {
  id: "canvas",
  width: 50,
  height: 20,
})

const EMPTY_BG = RGBA.fromHex("#222222")
const color = RGBA.fromHex("#00FF00")
const fb = canvas.frameBuffer
const progress = 0.7
const width = 20
const filled = Math.floor(width * progress)
const x = 5
const y = 10

for (let i = 0; i < filled; i++) {
  fb.setCell(x + i, y, "█", color, EMPTY_BG)
}
for (let i = filled; i < width; i++) {
  fb.setCell(x + i, y, "░", RGBA.fromHex("#333333"), EMPTY_BG)
}
fb.drawText("Downloading package", 5, 8, RGBA.fromHex("#FFFFFF"))

renderer.root.add(canvas)
