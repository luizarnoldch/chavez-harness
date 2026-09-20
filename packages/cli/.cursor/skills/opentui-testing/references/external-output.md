# External output

The setup listens for `external_output` events. It records text, rows, snapshot width and height, `rowColumns`, `startOnNewLine`, and `trailingNewline`. Recording does **not** consume the renderer’s native output queue.

| Method | Behavior |
|--------|----------|
| `externalOutput.take()` | Return all commits and clear the recorder |
| `externalOutput.takeText()` | Consume all commits and join their rows with newlines |
| `externalOutput.clear()` | Discard all commits |

## Related

`--topic create-test-renderer`, `--topic capture`
