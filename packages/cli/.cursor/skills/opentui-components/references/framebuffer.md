# FrameBuffer

Low-level 2D cell buffer for custom graphics. Use Image to display encoded images without direct cell drawing. **Core only** (Advanced).

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | FrameBufferRenderable |
| React | Unavailable |
| Solid | Unavailable |
| Status | Advanced |

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| width / height | number | **required** | Cells |
| respectAlpha | boolean | `false` | Alpha blending |
| position / offsets | layout | relative | Positioning |

Access drawing via `canvas.frameBuffer` (OptimizedBuffer).

## Drawing methods (on frameBuffer)

| Method | Notes |
|--------|-------|
| setCell | One cell; first code point only; no wide graphemes |
| setCellWithAlphaBlending | Alpha composition |
| drawText | Unicode string (prefer for wide/joined) |
| fillRect | Fill rectangle with color |
| drawFrameBuffer | Copy another buffer |
| drawImage | Place NativeImage |
| colorMatrix / colorMatrixUniform | 4x4 RGBA transforms |

## Related

`--topic buffer-api`, `--topic image`, `--topic native-image`, `--asset framebuffer-progress`
