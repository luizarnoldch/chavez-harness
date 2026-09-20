import { TextRenderable, BoxRenderable, t, bold, fg, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer()

const statusBar = new BoxRenderable(renderer, {
  position: "absolute",
  bottom: 0,
  width: "100%",
  height: 1,
  backgroundColor: "#333333",
  flexDirection: "row",
  justifyContent: "space-between",
  paddingLeft: 1,
  paddingRight: 1,
})
statusBar.add(
  new TextRenderable(renderer, {
    content: t`${bold("myfile.ts")} - ${fg("#888888")("TypeScript")}`,
  }),
)
statusBar.add(
  new TextRenderable(renderer, {
    content: t`Ln ${fg("#00FF00")("42")}, Col ${fg("#00FF00")("15")}`,
  }),
)

renderer.root.add(statusBar)
