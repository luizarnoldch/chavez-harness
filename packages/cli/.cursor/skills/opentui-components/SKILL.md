---
name: opentui-components
description: >-
  OpenTUI Core renderables and component APIs (Text, Box, Input, Textarea,
  Select, TabSelect, Slider, ScrollBox, ScrollBar, Code, Markdown, Diff,
  TextTable, ASCIIFont, FrameBuffer, Image, NativeImage, QR, EmbeddedTerminal,
  Buffer API). Use when building TUI UI with @opentui/core components, choosing
  between renderables, or looking up props, events, and availability across
  Core, React, and Solid.
---

# OpenTUI Components

Catalog of OpenTUI renderables and related APIs. For React JSX, hooks, and
`createRoot`, use the `opentui-react` skill instead.

## How to load docs

Do **not** read `references/` or `assets/` wholesale. Fetch only the concept you need:

1. Identify the component or API (layout, input, scroll, rich content, graphics).
2. Discover topics/assets if unsure: `bash scripts/main.sh --list`
3. Load one concept: `bash scripts/main.sh --topic <id>`
4. Load one snippet: `bash scripts/main.sh --asset <id>`
5. Use **only** that output for the current step.

Run scripts from this skill directory (or via absolute path to `scripts/main.sh`).

## Choose checklist

- [ ] Labels/prose → `text`; source → `code`; documents → `markdown`; patches → `diff`
- [ ] Layout/border → `box`; scrollable children → `scrollbox` (not standalone `scrollbar`)
- [ ] One line → `input`; multi-line → `textarea`
- [ ] Discrete vertical → `select`; horizontal tabs → `tab-select`; continuous → `slider`
- [ ] Display image → `image`; pixel work → `native-image` / `framebuffer`
- [ ] QR display → `qr-code` (+ register); matrix/SVG → `qr-encoder`
- [ ] VT screen (no PTY) → `embedded-terminal`; low-level cells → `buffer-api`

## Topic map

### Overview

| Task | `--topic` | Optional `--asset` |
|------|-----------|--------------------|
| Availability / choose component | `overview` | |

### Display and layout

| Task | `--topic` | Optional `--asset` |
|------|-----------|--------------------|
| Text / styled labels | `text` | `text-status-bar` |
| Box layout / border / title | `box` | `box-card` |
| Inline span/b/i/a inside text | `inline-text` | |

### Input and selection

| Task | `--topic` | Optional `--asset` |
|------|-----------|--------------------|
| Single-line input | `input` | `input-login` |
| Multi-line textarea | `textarea` | `textarea-submit` |
| Vertical select list | `select` | `select-menu` |
| Horizontal tab strip | `tab-select` | `tab-select-panels` |
| Continuous slider (Core only) | `slider` | `slider-basic` |

### Scrolling

| Task | `--topic` | Optional `--asset` |
|------|-----------|--------------------|
| Scrollable children | `scrollbox` | `scrollbox-sticky` |
| External scrollbar (Core only) | `scrollbar` | `scrollbar-basic` |

### Rich content

| Task | `--topic` | Optional `--asset` |
|------|-----------|--------------------|
| Syntax-highlighted code | `code` | `code-highlight` |
| Markdown documents | `markdown` | `markdown-streaming` |
| Line number gutter | `line-number` | `line-number-code` |
| Unified/split diff | `diff` | `diff-split` |
| Styled cell table (Core only) | `text-table` | `text-table-basic` |

### Graphics and media

| Task | `--topic` | Optional `--asset` |
|------|-----------|--------------------|
| ASCII art fonts | `ascii-font` | `ascii-font-welcome` |
| Direct cell canvas | `framebuffer` | `framebuffer-progress` |
| Encoded image display | `image` | `image-load` |
| Decode / transform pixels | `native-image` | `native-image-load` |
| QR renderable | `qr-code` | `qr-code-basic` |
| QR encoder (matrix/SVG) | `qr-encoder` | `qr-encode-terminal` |
| Embedded VT terminal | `embedded-terminal` | `embedded-terminal-write` |

### Advanced

| Task | `--topic` | Optional `--asset` |
|------|-----------|--------------------|
| OptimizedBuffer drawing | `buffer-api` | `buffer-create` |
