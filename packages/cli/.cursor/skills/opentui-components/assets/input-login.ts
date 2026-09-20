import { BoxRenderable, InputRenderable, TextRenderable, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer()
const form = new BoxRenderable(renderer, {
  width: 40,
  borderStyle: "rounded",
  title: "Login",
  padding: 1,
  gap: 1,
})
const usernameInput = new InputRenderable(renderer, {
  id: "username-input",
  placeholder: "Enter username",
  width: 20,
  backgroundColor: "#222",
  focusedBackgroundColor: "#333",
})
const passwordInput = new InputRenderable(renderer, {
  id: "password-input",
  placeholder: "Enter password",
  width: 20,
  backgroundColor: "#222",
  focusedBackgroundColor: "#333",
})

form.add(new TextRenderable(renderer, { content: "Username:", fg: "#888888" }))
form.add(usernameInput)
form.add(new TextRenderable(renderer, { content: "Password:", fg: "#888888" }))
form.add(passwordInput)
renderer.root.add(form)
usernameInput.focus()

const inputs = [usernameInput, passwordInput]
let focusIndex = 0
renderer.keyInput.on("keypress", (key) => {
  if (key.name === "tab") {
    focusIndex = (focusIndex + 1) % inputs.length
    inputs[focusIndex].focus()
  }
})
