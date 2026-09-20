# Embedded terminal

Parses VT output and draws a child terminal screen. Ghostty VT in native artifact. **Not a process and not a PTY** — you write child output in; you send encoded input back.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | EmbeddedTerminalRenderable |
| React | Unavailable (use Core or `extend`) |
| Solid | Unavailable (Solid `{ id }` only — use adapter for cols/rows/maxScrollback) |
| Status | Built-in Core renderable |

Supported: x86_64/aarch64 macOS, Linux glibc/musl, Windows GNU. Other targets throw.

## I/O model

- `write(string | Uint8Array)` — feed child stdout/stderr (VT)
- `onData(data, source)` — `"input"` (keys/mouse) or `"response"` (queries like DSR) → child's stdin
- `onTerminalResize(cols, rows)` — resize child
- Incomplete escapes kept across `write` calls

## Constructor options

| Option | Default | Notes |
|--------|---------|-------|
| cols / rows | numeric width/height else 80/24 | Initial grid; constructor-only |
| width / height | cols / rows | Layout; visible size change resizes emulator |
| maxScrollback | 10000 | **Bytes**, not lines; constructor-only |
| selectable | true | Joins renderer selection |

## Focus / input

Focusable. `handleKeyPress` / `handlePaste` encode for child. Host `keyInput` listeners run first — use for Escape shortcuts with `stopPropagation`.

## Paint limits

Character grid only — no Kitty/Sixel compose in paint path. `onScreenChange` after every successful compose while visible (not dirty-content signal).

## Related

`--topic buffer-api`, `--asset embedded-terminal-write`
