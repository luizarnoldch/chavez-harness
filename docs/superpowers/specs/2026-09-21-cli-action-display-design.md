# CLI action display (tool rows) — Design

**Date:** 2026-09-21  
**Status:** Approved (Enfoque 1)

## Goal

Show agent tool actions in the CLI TUI live during generate and persist them in message `parts` for history, compact by default and expandable for args/result. Protocol ready for web later; web UI out of scope for this delivery.

## Decisions

- **Scope:** Live stream + history (`parts`), not a separate todos panel.
- **Surface:** CLI TUI first; wire/persistence shared.
- **Density:** Compact one-line rows; expand for args/result (and short diff when available).
- **Transport:** Extend `chat.generate.progress` with optional `toolCall`; include `parts` on `chat.generate.result`.

## Data flow

1. Daemon maps `SDKToolUseMessage` → progress `{ phase: "tool", toolCall }`.
2. Server rebroadcasts `toolCall` to workspace clients.
3. CLI bridge upserts tools into `generateStream.draftTools` + `draftText`.
4. Daemon accumulates ordered `parts` (`tool-call` + `text`) and returns them on result.
5. Server persists assistant `parts` (fallback to text-only if empty).
6. `MessageList` renders tool rows from history parts and live draft.

## Wire shapes

```ts
// progress (optional fields)
toolCall?: {
  id: string;
  name: string;
  status: "running" | "completed" | "error";
  args?: Record<string, unknown>; // JSON-safe, truncated
  result?: string; // stringified/truncated
}

// result.data
parts?: MessagePart[]; // tool-call | text (reasoning deferred)
```

Truncation: ~4KB per args/result payload in the daemon.

## UI

- Status glyphs: `◐` running, `✔` completed, `✗` error.
- Summary line: tool-specific (path, pattern, command) with fallback `name`.
- Expand: pretty args + result; use `<diff>` only when result looks like a unified diff.
- Footer phase labels unchanged (`herramientas…`).

## Out of scope

- Web action UI
- Todos panel / `readTodos` visualization
- Reasoning text streaming
- New message part types beyond existing `tool-call` / `text`
