import { CodeRenderable, createCliRenderer, SyntaxStyle, RGBA } from "@opentui/core"

const renderer = await createCliRenderer()

const syntaxStyle = SyntaxStyle.fromStyles({
  default: { fg: RGBA.defaultForeground() },
  keyword: { fg: RGBA.defaultForeground(), bold: true },
  string: { fg: RGBA.fromIndex(247) },
  comment: { fg: RGBA.fromIndex(244), italic: true },
})

const code = new CodeRenderable(renderer, {
  id: "code",
  content: `function hello() {
  // This is a comment
  const message = "Hello, world!"
  return message
}`,
  filetype: "javascript",
  syntaxStyle,
  width: 50,
  height: 10,
})

renderer.root.add(code)
