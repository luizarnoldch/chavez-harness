import { BoxRenderable, TextRenderable, t, bold, fg, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer()

function Card(props: { title: string; description: string }) {
  const card = new BoxRenderable(renderer, {
    width: 40,
    borderStyle: "rounded",
    borderColor: "#666",
    padding: 1,
    margin: 1,
  })
  card.add(
    new TextRenderable(renderer, {
      content: t`${bold(fg("#00FFFF")(props.title))}`,
    }),
  )
  card.add(
    new TextRenderable(renderer, {
      content: props.description,
      fg: "#AAAAAA",
    }),
  )
  return card
}

const cards = new BoxRenderable(renderer, { flexDirection: "row", flexWrap: "wrap" })
cards.add(Card({ title: "Feature 1", description: "Description of feature 1" }))
cards.add(Card({ title: "Feature 2", description: "Description of feature 2" }))
cards.add(Card({ title: "Feature 3", description: "Description of feature 3" }))
renderer.root.add(cards)
