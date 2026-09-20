import {
  BoxRenderable,
  TabSelectRenderable,
  TabSelectRenderableEvents,
  TextRenderable,
  createCliRenderer,
} from "@opentui/core"

const renderer = await createCliRenderer()

function createPanel(content: string) {
  const panel = new BoxRenderable(renderer, { padding: 1 })
  panel.add(new TextRenderable(renderer, { content }))
  return panel
}

const panels = {
  home: createPanel("Home content here"),
  files: createPanel("File browser here"),
  settings: createPanel("Settings form here"),
}

const container = new BoxRenderable(renderer, {
  width: 60,
  height: 20,
  borderStyle: "rounded",
})

const tabs = new TabSelectRenderable(renderer, {
  width: 60,
  tabWidth: 20,
  options: [
    { name: "Home", description: "Dashboard" },
    { name: "Files", description: "Browse files" },
    { name: "Settings", description: "Preferences" },
  ],
})

let currentPanel = panels.home
const contentArea = new BoxRenderable(renderer, {
  flexGrow: 1,
  padding: 1,
})
contentArea.add(currentPanel)

tabs.on(TabSelectRenderableEvents.ITEM_SELECTED, (_index, option) => {
  contentArea.remove(currentPanel)
  switch (option.name) {
    case "Home":
      currentPanel = panels.home
      break
    case "Files":
      currentPanel = panels.files
      break
    case "Settings":
      currentPanel = panels.settings
      break
  }
  contentArea.add(currentPanel)
})

container.add(tabs)
container.add(contentArea)
renderer.root.add(container)
tabs.focus()
