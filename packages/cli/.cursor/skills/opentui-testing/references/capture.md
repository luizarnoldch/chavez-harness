# Capture

`captureCharFrame()` decodes the current character buffer. Use for text assertions and snapshots.

`captureSpans()` preserves dimensions, cursor coordinates, and each line’s styled spans:

```ts
const setup = await createTestRenderer({ width: 20, height: 4 })

try {
  setup.renderer.root.add(
    new TextRenderable(setup.renderer, { content: "Status", fg: "#22c55e" }),
  )
  await setup.renderOnce()
  const captured = setup.captureSpans()
  console.log(captured.cols, captured.rows, captured.cursor, captured.lines)
} finally {
  setup.renderer.destroy()
}
```

Span capture is lossy for full grapheme clustering and hyperlink IDs.

## Related

`--asset capture-spans`, `--topic waiting`, `--topic rendering-diagnostics`
