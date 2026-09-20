import { SliderRenderable, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer()

const slider = new SliderRenderable(renderer, {
  id: "volume",
  orientation: "horizontal",
  width: 30,
  height: 1,
  min: 0,
  max: 100,
  value: 25,
  onChange: (value) => {
    console.log("Value:", value)
  },
})

renderer.root.add(slider)
