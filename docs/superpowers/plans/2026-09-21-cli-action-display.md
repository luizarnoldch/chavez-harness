# CLI Action Display Implementation Plan

> Implemented 2026-09-21.

**Goal:** Live + persisted tool-call rows in the CLI TUI via extended `chat.generate.progress` / result `parts`.

**Architecture:** Daemon maps SDK `tool_call` into progress + accumulated parts; server rebroadcasts and persists; CLI bridge + MessageList render compact expandable rows.

## Tasks

- [x] Protocol: `toolCall` on progress + `parts` on result
- [x] Daemon SDK mapping + parts accumulation
- [x] Server persist + rebroadcast
- [x] CLI bridge + ToolCallRow UI
- [x] Tests + typecheck
