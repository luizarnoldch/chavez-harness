import { OptimizedBuffer, RGBA } from "@opentui/core"

const buffer = OptimizedBuffer.create(40, 10, "unicode", {
  id: "preview",
  respectAlpha: true,
})

try {
  buffer.clear(RGBA.fromInts(0, 0, 0, 0))
  buffer.drawText("status", 1, 1, RGBA.fromInts(255, 255, 255))
  buffer.fillRect(5, 3, 10, 2, RGBA.fromHex("#334455"))
} finally {
  buffer.destroy()
}
