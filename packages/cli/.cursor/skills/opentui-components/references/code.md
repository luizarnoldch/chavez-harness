# Code

Source text with Tree-sitter syntax highlighting. Use Markdown for documents or Diff for changed lines.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | CodeRenderable |
| React | `<code>` (automatic) |
| Solid | `<code>` (automatic) |
| Status | Built in |

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| content | string | `""` | Source |
| filetype | string | - | Language id |
| syntaxStyle | SyntaxStyle | **required** | From `SyntaxStyle.fromStyles(...)` |
| streaming | boolean | `false` | Incremental update mode |
| conceal | boolean | `true` | Hide concealed syntax elements |
| drawUnstyledText | boolean | `true` | Show unstyled while highlighting |
| treeSitterClient | TreeSitterClient | - | Custom client |
| selectable / selectionBg / selectionFg | - | selectable true | Selection |
| wrapMode / textAlign | inherited | word / left | From TextBufferRenderable |

Also: `lineCount`, `scrollY`/`scrollX`, `scrollWidth`/`scrollHeight`, `isHighlighting`, `plainText`.

## Bundled languages

JavaScript/JSX, TypeScript/TSX, Markdown/Markdown inline, Zig. Others need Tree-sitter config.

## Style tokens

Define via `SyntaxStyle.fromStyles({ keyword, string, comment, ..., default })`. Each may have `fg`, `bg`, `bold`, `italic`, `underline`, `dim`. Markdown uses `markup.*` names.

## Streaming

When content arrives incrementally (e.g. LLM). With `drawUnstyledText: false`, later updates keep previous buffer visible while highlight completes.

## Related

`--topic markdown`, `--topic line-number`, `--topic diff`, `--asset code-highlight`
