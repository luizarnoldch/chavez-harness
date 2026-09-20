# Buffer API

Advanced reference for OptimizedBuffer — a 2D grid of terminal cells (char, fg, bg, attributes). Use FrameBuffer when a component should own the buffer in the tree.

## Create and destroy

```ts
const buffer = OptimizedBuffer.create(40, 10, "unicode", { id: "preview", respectAlpha: true })
try {
  buffer.clear(/* bg */)
  buffer.drawText("status", 1, 1, fg)
} finally {
  buffer.destroy() // not dispose(); idempotent
}
```

`widthMethod`: `"unicode"` \| `"wcwidth"`. Creator owns independent buffers and must `destroy()`.

## Renderer buffers

`CliRenderer.nextRenderBuffer` / `currentRenderBuffer` — renderer-owned. Draw into next; do not destroy or mutate current. Do not retain raw views across resize.

## Cell model

`buffers` returns native aliases: `char` Uint32Array, `fg`/`bg` Uint16Array (4 entries/cell), `attributes` Uint32Array. Treat as internal.

## Drawing inventory (high level)

| Group | Methods |
|-------|---------|
| Basic | clear, setCell, setCellWithAlphaBlending, drawChar, drawText, fillRect |
| Boxes/grids | drawBox, drawGrid |
| Compose | drawFrameBuffer, drawTextBuffer, drawEditorView |
| Images | drawImage, drawSuperSampleBuffer, drawGrayscaleBuffer*, drawPackedBuffer |
| Clip/opacity | push/pop/clear ScissorRect; push/pop/clear Opacity |
| Color | colorMatrix, colorMatrixUniform |

`setCell` is one-cell scalars only. Prefer `drawText` for Unicode. `encodeUnicode` + `drawChar` + `freeUnicode` for repeated encoded drawing.

## Capture

`getRealCharBytes`, `getSpanLines` — useful for tests; not lossless (hyperlinks, multi-codepoint graphemes, images).

## Gotchas

- Never mutate raw `buffers.char`/`attributes` for arbitrary text (bypasses grapheme/link/image bookkeeping).
- Successful `drawImage` retains NativeImage until clear/resize/destroy; caller still disposes own handle.

## Related

`--topic framebuffer`, `--topic native-image`, `--asset buffer-create`
