import { ASCIIFontRenderable, BoxRenderable, TextRenderable, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer()

const welcomeScreen = new BoxRenderable(renderer, {
  width: "100%",
  height: "100%",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
})
welcomeScreen.add(
  new ASCIIFontRenderable(renderer, {
    text: "OPENTUI",
    font: "huge",
    color: "#00FFFF",
  }),
)
welcomeScreen.add(
  new TextRenderable(renderer, {
    content: "Terminal UI Framework",
    fg: "#888888",
  }),
)
welcomeScreen.add(
  new TextRenderable(renderer, {
    content: "Press any key to continue...",
    fg: "#444444",
  }),
)

renderer.root.add(welcomeScreen)
