import { MarkdownRenderable, SyntaxStyle, RGBA, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer()

const syntaxStyle = SyntaxStyle.fromStyles({
  "markup.heading.1": { fg: RGBA.fromHex("#58A6FF"), bold: true },
  "markup.list": { fg: RGBA.fromHex("#FF7B72") },
  "markup.raw": { fg: RGBA.fromHex("#A5D6FF") },
  default: { fg: RGBA.fromHex("#E6EDF3") },
})

const markdown = new MarkdownRenderable(renderer, {
  id: "readme",
  width: 60,
  content: "",
  syntaxStyle,
  streaming: true,
})

markdown.content += "# Live log\n"
markdown.content += "- line 1\n"
markdown.streaming = false

renderer.root.add(markdown)
