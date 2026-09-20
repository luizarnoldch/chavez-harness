# Markdown

Renders document structure; Tree-sitter highlighting in fenced code. Use Code when all content is source.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | MarkdownRenderable |
| React | `<markdown>` (automatic) |
| Solid | `<markdown>` (automatic) |
| Status | Built in |

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| content | string | `""` | Markdown source |
| syntaxStyle | SyntaxStyle | **required** | Token styles |
| fg / bg | ColorInput | - | Flow into inner code blocks |
| conceal | boolean | `true` | Hide markdown markers |
| concealCode | boolean | `false` | Conceal inside fences |
| streaming | boolean | `false` | Incremental; set `false` to finalize |
| tableOptions | MarkdownTableOptions | - | Table rendering |
| internalBlockMode | `"coalesced"` \| `"top-level"` | `"coalesced"` | Experimental top-level blocks |
| renderNode | hook | - | Custom token render |
| treeSitterClient | TreeSitterClient | - | Custom client |

## Fence filetype normalization

`tsx` → `typescriptreact`, `.jsx` → `javascriptreact`, etc. via `infoStringToFiletype()`. Extend with `extensionToFiletype` / `basenameToFiletype` maps.

## Streaming

Keep `streaming: true` while appending; set `false` when done to finalize trailing blocks. Tables include partial trailing rows.

## Stable block prefix (experimental)

With `internalBlockMode: "top-level"`, `_stableBlockCount` reports sealed top-level blocks for scrollback commits. Default `"coalesced"` for normal use.

## tableOptions (summary)

`style`: `"grid"` (boxed, full width) \| `"columns"` (borderless). Also `widthMode`, `columnFitter`, `wrapMode`, cell padding, borders, `selectable`.

Default style: `"columns"` when top-level mode, else `"grid"`.

## Custom fences

`createMarkdownCodeBlockRenderer({ lang: renderer })` — keys match normalized fence info.

## Related

`--topic code`, `--topic text-table`, `--asset markdown-streaming`
