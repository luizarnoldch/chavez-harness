# Testing exports

Supported testing surfaces (from the publish maps). Prefer these over implementation-looking exports.

## `@opentui/core/testing` (Bun and Node.js)

| Area | Symbols |
|------|---------|
| Renderer setup | `createTestRenderer`, `MockInput`, `MockMouse`, `TestExternalOutput`, `TestExternalOutputCommit`, `TestFlushOptions`, `TestRenderer`, `TestRendererOptions`, `TestRendererSetup`, `TestVisualIdleOptions`, `TestWaitForOptions` |
| Keyboard / mouse | `createMockKeys`, `createMockMouse`, `KeyCodes`, `KeyInput`, `MockKeysOptions`, `MouseButton`, `MouseButtons`, `MouseEventOptions`, `MouseEventType`, `MouseModifiers`, `MousePosition`, `pasteBytes` |
| Capabilities | `createTerminalCapabilities`, `setRendererCapabilities`, `TerminalCapabilitiesOverrides` |
| Deterministic | `createSpy`, `ManualClock`, `MockTreeSitterClient` |
| Recording | `RecordedFrame`, `TestRecorder` |

## Framework

| Entry | Symbols |
|-------|---------|
| `@opentui/react/test-utils` | `testRender` |
| `@opentui/solid` | `testRender` (alongside Solid root `render`) |

## `@opentui/keymap/testing`

`captureKeymapDiagnostics`, `createTestHostMetadata`, `createTestKeymap`, `createTestKeymapHost`, `CreateTestKeymapHostOptions`, `CreateTestKeymapOptions`, `DEFAULT_TEST_HOST_METADATA`, `TestDiagnosticCapture`, `TestHostMetadataOptions`, `TestKeymapEvent`, `TestKeymapHarness`, `TestKeymapHost`, `TestKeymapTarget`, `TestKeyModifierOptions`

## Related

`--topic create-test-renderer`, `--topic keymap-testing`, `--topic react-test-utils`
