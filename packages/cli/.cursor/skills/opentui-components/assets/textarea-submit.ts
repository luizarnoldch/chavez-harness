import { TextareaRenderable, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer()

const textarea = new TextareaRenderable(renderer, {
  id: "notes",
  width: 50,
  height: 6,
  placeholder: "Type notes here...",
  backgroundColor: "#1a1a1a",
  focusedBackgroundColor: "#222222",
  textColor: "#FFFFFF",
  cursorColor: "#00FF88",
  onSubmit: () => {
    console.log("Submitted:", textarea.plainText)
  },
  keyBindings: [{ name: "return", ctrl: true, action: "submit" }],
})

renderer.root.add(textarea)
textarea.focus()
