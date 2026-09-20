import { TextTableRenderable, bold, fg, type TextChunk, type TextTableContent, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer()

const cell = (text: string): TextChunk[] => [{ __isChunk: true, text }]

const content: TextTableContent = [
  [[bold("Service")], [bold("Status")], [bold("Notes")]],
  [cell("api"), [fg("#00d4aa")("OK")], cell("latency 28ms")],
  [cell("worker"), [fg("#b8a0ff")("DEGRADED")], cell("queue depth: 124")],
]

const table = new TextTableRenderable(renderer, {
  width: "100%",
  wrapMode: "word",
  columnWidthMode: "content",
  borderStyle: "rounded",
  content,
})

renderer.root.add(table)
