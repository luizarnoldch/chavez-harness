# Solid test-utils

`@opentui/solid` exports `testRender(node, options?)`. Mounts a Solid root and returns the Core `TestRendererSetup`. Renderer destruction disposes the root and runs Solid cleanup.

Use the returned Core setup for frame capture, waits, input, and stats — same as `createTestRenderer()`. Always call `setup.renderer.destroy()` in teardown.

For Solid-specific bindings outside tests, see Solid package docs. Prefer `--topic create-test-renderer` and `--topic waiting` for shared setup behavior.

## Related

`--topic react-test-utils`, `--topic create-test-renderer`
