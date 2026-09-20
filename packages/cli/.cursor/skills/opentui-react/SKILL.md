---
name: opentui-react
description: >-
  React bindings for OpenTUI in the CLI package (createRoot, hooks, JSX
  intrinsics, test-utils, extend). Use when editing packages/cli, @opentui/react,
  TUI components, or when the user asks about OpenTUI React setup, hooks,
  testing, lifecycle, styling, or component extension.
---

# OpenTUI React (CLI)

Use React components and hooks to build an OpenTUI application in `packages/cli`.

## How to load docs

Do **not** read `references/` or `assets/` wholesale. Fetch only the concept you need:

1. Identify the task (bootstrap, hook, lifecycle, test, extend, etc.).
2. Discover topics/assets if unsure: `bash scripts/main.sh --list`
3. Load one concept: `bash scripts/main.sh --topic <id>`
4. Load one snippet: `bash scripts/main.sh --asset <id>`
5. Use **only** that output for the current step.

Run scripts from this skill directory (or via absolute path to `scripts/main.sh`).

## Task checklist

- [ ] Bootstrap with `createCliRenderer` + `createRoot`
- [ ] Own shutdown: call `renderer.destroy()` on every exit path
- [ ] Keyboard / resize / paste via the matching hook topic
- [ ] Style with props or `style`
- [ ] Tests via `testRender` (always destroy in teardown)
- [ ] Custom JSX via `extend` + `OpenTUIComponents`

## Topic map

| Task | `--topic` | Optional `--asset` |
|------|-----------|--------------------|
| Requirements / React version | `requirements` | |
| Install packages | `install` | |
| Hello world | `quick-start` | `quick-start` |
| tsconfig | `typescript` | |
| Runtime TSX plugins | `runtime-modules` | |
| Intrinsic elements | `components` | |
| `createRoot` API | `create-root` | |
| unmount vs destroy | `lifecycle` | |
| Hooks intro | `hooks-overview` | |
| Specific hook | `use-renderer`, `use-keyboard`, `use-on-resize`, `use-terminal-dimensions`, `use-paste`, `use-focus`, `use-blur`, `use-selection-handler`, `use-timeline` | |
| Styling | `styling` | |
| Testing | `testing` | `test-render` |
| Login form example | `login-form` | `login-form` |
| Custom components | `component-extension` | `console-button` |
| React DevTools | `react-devtools` | |
