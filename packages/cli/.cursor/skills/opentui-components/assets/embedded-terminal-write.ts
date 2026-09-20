import { EmbeddedTerminalRenderable, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer()
const terminal = new EmbeddedTerminalRenderable(renderer, {
  id: "session",
  width: 80,
  height: 24,
})

terminal.write("hello \x1b[1;32mworld\x1b[0m\r\n")
terminal.onData = (data, source) => {
  // Forward both "input" and "response" to child stdin when attached
  console.log(source, data.byteLength)
}

renderer.root.add(terminal)
terminal.focus()
