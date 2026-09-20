import { createCliRenderer } from "@opentui/core"
import { QRCodeRenderable } from "@opentui/qrcode"

const renderer = await createCliRenderer()

const qr = new QRCodeRenderable(renderer, {
  id: "docs-link",
  content: "https://opentui.com/docs",
  quietZone: 4,
  scale: 2,
  fit: "contain",
  fallbackContent: "Resize for QR",
  fallbackColor: "#94a3b8",
})

renderer.root.add(qr)
