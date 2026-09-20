# Strategy

Test the smallest observable boundary that can fail.

## Choose a harness

| Boundary | Approach |
|----------|----------|
| Parsers, state transitions, pure logic | No renderer |
| Renderable interaction, frame text, styled spans, native cell updates | `createTestRenderer()` from `@opentui/core/testing` |
| Framework effects / reconciliation | React or Solid `testRender` |
| Keymap layers, addons, focus, dispatch, diagnostics | `@opentui/keymap/testing` (no terminal renderer) |
| Resource owners | Destruction, setup failure, partial init, repeated cleanup |

`@opentui/core/testing` provides a real `CliRenderer` with native in-memory output, plus input, mouse, clock, capability, Tree-sitter, spy, and frame-recording helpers. Default setup does **not** write frames to the host terminal.

## Related

`--topic create-test-renderer`, `--topic keymap-testing`, `--topic react-test-utils`
