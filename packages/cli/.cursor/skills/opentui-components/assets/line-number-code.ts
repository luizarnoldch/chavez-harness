import {
  CodeRenderable,
  LineNumberRenderable,
  ScrollBoxRenderable,
  SyntaxStyle,
  RGBA,
  createCliRenderer,
} from "@opentui/core"

const renderer = await createCliRenderer()

const syntaxStyle = SyntaxStyle.fromStyles({
  default: { fg: RGBA.fromHex("#E6EDF3") },
})

const code = new CodeRenderable(renderer, {
  id: "code",
  content: "const port = 3000\nserve(port)\nawait ready()",
  filetype: "typescript",
  syntaxStyle,
  width: "100%",
})

const lineNumbers = new LineNumberRenderable(renderer, {
  id: "code-lines",
  target: code,
  minWidth: 3,
  paddingRight: 1,
  fg: "#6b7280",
  bg: "#161b22",
})

lineNumbers.setLineSign(1, { before: ">" })

const scrollbox = new ScrollBoxRenderable(renderer, {
  id: "scrollbox",
  width: 70,
  height: 18,
})
scrollbox.add(lineNumbers)
renderer.root.add(scrollbox)
