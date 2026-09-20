# Inline text elements

React and Solid register `<span>`, `<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<br>`, and `<a>`. Built-in text children — not standalone layout components.

## Availability

| Surface | Package | Core | React | Solid | Status |
|---------|---------|------|-------|-------|--------|
| Inline styling | `@opentui/react`, `@opentui/solid` | TextNodeRenderable | span, b, strong, i, em, u | same | Built-in |
| Line break | same | TextNodeRenderable | `<br>` | `<br>` | Built-in |
| Hyperlink | same | TextNodeRenderable | `<a href>` | `<a href>` | Built-in |

## Rules

- Use **only inside** `<text>`.
- Cannot mount under Box or another layout element directly.
- `<a>` accepts `href` and creates terminal hyperlink metadata.

## Related

`--topic text`
