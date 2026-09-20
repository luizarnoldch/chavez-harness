# Components overview

Tables compare availability across Core, React, and Solid.

- **Automatic**: framework element needs no component-specific registration.
- **Separately registered**: package setup on the component page (e.g. QR).
- **Unavailable**: shipped API does not expose that surface.

## Display and layout

| Component | Package | Core | React | Solid | Status |
|-----------|---------|------|-------|-------|--------|
| Text | `@opentui/core` | TextRenderable | `<text>` auto | `<text>` auto | Built in |
| Box | `@opentui/core` | BoxRenderable | `<box>` auto | `<box>` auto | Built in |

Choose **Code** for parsed source, **Markdown** for documents. Choose **ScrollBox** when children must scroll.

## Inline text (framework only)

React/Solid register `<span>`, `<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<br>`, `<a href>`. Text-only children inside `<text>` — not layout components. See `--topic inline-text`.

## Input and selection

| Component | Package | Core | React | Solid | Status |
|-----------|---------|------|-------|-------|--------|
| Input | `@opentui/core` | InputRenderable | `<input>` | `<input>` | Built in |
| Textarea | `@opentui/core` | TextareaRenderable | `<textarea>` | `<textarea>` | Built in |
| Select | `@opentui/core` | SelectRenderable | `<select>` | `<select>` | Built in |
| TabSelect | `@opentui/core` | TabSelectRenderable | `<tab-select>` | `<tab_select>` | Built in |
| Slider | `@opentui/core` | SliderRenderable | Unavailable | Unavailable | Core only |

## Scrolling

| Component | Package | Core | React | Solid | Status |
|-----------|---------|------|-------|-------|--------|
| ScrollBox | `@opentui/core` | ScrollBoxRenderable | `<scrollbox>` | `<scrollbox>` | Built in |
| ScrollBar | `@opentui/core` | ScrollBarRenderable | Unavailable | Unavailable | Core only |

## Rich content

| Component | Package | Core | React | Solid | Status |
|-----------|---------|------|-------|-------|--------|
| Code | `@opentui/core` | CodeRenderable | `<code>` | `<code>` | Built in |
| Markdown | `@opentui/core` | MarkdownRenderable | `<markdown>` | `<markdown>` | Built in |
| Line number | `@opentui/core` | LineNumberRenderable | `<line-number>` | `<line_number>` (typing gap) | Built in |
| Diff | `@opentui/core` | DiffRenderable | `<diff>` | `<diff>` (typing gap) | Built in |
| TextTable | `@opentui/core` | TextTableRenderable | Unavailable | Unavailable | Core only |

Bundled Tree-sitter: JS/JSX, TS/TSX, Markdown, Zig. Other grammars need configuration.

## Graphics and media

| Component | Package | Core | React | Solid | Status |
|-----------|---------|------|-------|-------|--------|
| ASCIIFont | `@opentui/core` | ASCIIFontRenderable | `<ascii-font>` | `<ascii_font>` | Built in |
| FrameBuffer | `@opentui/core` | FrameBufferRenderable | Unavailable | Unavailable | Advanced |
| Image | `@opentui/core` | ImageRenderable | `<image>` | `<image>` | Built in |
| QR code | `@opentui/qrcode` | QRCodeRenderable | register then `<qr-code>` | register then `<qr_code>` | Separate package |
| Embedded terminal | `@opentui/core` | EmbeddedTerminalRenderable | Unavailable | Unavailable | Core only |

Use Buffer API for low-level OptimizedBuffer. TimeToFirstDraw is a diagnostic, not a display component.

## Related skills

For React `createRoot`, hooks, and JSX setup → skill `opentui-react`.
