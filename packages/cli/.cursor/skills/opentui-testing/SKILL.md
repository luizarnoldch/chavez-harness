---
name: opentui-testing
description: >-
  OpenTUI testing helpers: createTestRenderer, frame waits, captureCharFrame,
  mockInput/mockMouse, ManualClock, TestRecorder, React/Solid testRender,
  @opentui/keymap/testing, and render diagnostics. Use when writing or
  debugging OpenTUI tests, asserting TUI frames, simulating keyboard/mouse,
  testing keymaps/addons, or choosing between pure-logic vs renderer tests.
---

# OpenTUI Testing

Test the smallest observable boundary that can fail. Load only the concept you need via the CLI below.

## How to load docs

Do **not** read `references/` or `assets/` wholesale. Fetch only the concept you need:

1. Identify the task (renderer setup, wait, capture, input, keymap, diagnostics, etc.).
2. Discover topics/assets if unsure: `bash scripts/main.sh --list`
3. Load one concept: `bash scripts/main.sh --topic <id>`
4. Load one snippet: `bash scripts/main.sh --asset <id>`
5. Use **only** that output for the current step.

Run scripts from this skill directory (or via absolute path to `scripts/main.sh`).

## Strategy checklist

- [ ] Pure parsers / state transitions → no renderer
- [ ] Renderable interaction / frames / spans → `createTestRenderer`
- [ ] Always `setup.renderer.destroy()` in `finally` or teardown
- [ ] Framework effects / reconciliation → React or Solid `testRender`
- [ ] Keymap layers / addons / focus / dispatch → `@opentui/keymap/testing`
- [ ] Resource owners: test destruction, setup failure, partial init, repeated cleanup

## Topic map

### Strategy and setup

| Task | `--topic` | Optional `--asset` |
|------|-----------|--------------------|
| When to use which harness | `strategy` | |
| `createTestRenderer` defaults / setup | `create-test-renderer` | `hello-renderer` |
| Testing symbol index | `testing-exports` | |

### Frames and output

| Task | `--topic` | Optional `--asset` |
|------|-----------|--------------------|
| Waits / flush / visual idle | `waiting` | `wait-for-frame` |
| Text and styled capture | `capture` | `capture-spans` |
| External / split-footer output | `external-output` | |
| Frame recording | `test-recorder` | `test-recorder` |

### Input and capabilities

| Task | `--topic` | Optional `--asset` |
|------|-----------|--------------------|
| Keyboard mock | `keyboard` | `keyboard-input` |
| Mouse mock | `mouse` | `mouse-click` |
| Terminal capabilities fixture | `capabilities` | |

### Deterministic helpers

| Task | `--topic` | Optional `--asset` |
|------|-----------|--------------------|
| Manual clock | `manual-clock` | `manual-clock` |
| Mock Tree-sitter | `mock-tree-sitter` | `mock-tree-sitter` |
| Callback spy | `create-spy` | `create-spy` |

### Framework and keymap

| Task | `--topic` | Optional `--asset` |
|------|-----------|--------------------|
| React `testRender` | `react-test-utils` | `react-test-render` |
| Solid `testRender` | `solid-test-utils` | |
| Keymap / addon harness | `keymap-testing` | `keymap-addon` |

### Diagnostics

| Task | `--topic` | Optional `--asset` |
|------|-----------|--------------------|
| Choose render diagnostic | `rendering-diagnostics` | |
| Env vars for test/debug | `env-diagnostics` | |

## Related skills

- React bindings / hooks: `opentui-react`
- Core renderables / components: `opentui-components`
