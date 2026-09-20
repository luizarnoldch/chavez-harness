import { BoxRenderable, SelectRenderable, SelectRenderableEvents, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer()

const fileMenu = new SelectRenderable(renderer, {
  width: 25,
  height: 12,
  options: [
    { name: "New", description: "Create new file (Ctrl+N)" },
    { name: "Open...", description: "Open file (Ctrl+O)" },
    { name: "Save", description: "Save file (Ctrl+S)" },
    { name: "Save As...", description: "Save with new name" },
    { name: "---", description: "" },
    { name: "Exit", description: "Quit application (Ctrl+Q)" },
  ],
})

fileMenu.on(SelectRenderableEvents.ITEM_SELECTED, (_index, option) => {
  console.log("Selected:", option.name)
})

const menuPanel = new BoxRenderable(renderer, {
  borderStyle: "single",
  borderColor: "#666",
})
menuPanel.add(fileMenu)

fileMenu.focus()
renderer.root.add(menuPanel)
