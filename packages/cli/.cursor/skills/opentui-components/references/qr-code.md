# QR code

QR Code Model 2 as a renderable (half-block cells). Separate package; register for React/Solid.

## Availability

| Field | Value |
|-------|-------|
| Package | Core `@opentui/qrcode`; React `@opentui/qrcode/react`; Solid `@opentui/qrcode/solid` |
| Core | QRCodeRenderable |
| React | `registerQRCode()` then `<qr-code>` |
| Solid | `registerQRCode()` then `<qr_code>` |
| Status | Separately registered |

Install: `bun add @opentui/qrcode`

## Key properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| content | string | `""` | Text to encode |
| errorCorrectionLevel | ErrorCorrectionLevel | `M` | L/M/Q/H |
| quietZone | number | `4` | Min 4 modules for standard QR |
| scale | number | `1` | Columns per module before fit |
| fit | `"contain"` \| `"none"` | `"contain"` | Shrink to parent |
| foregroundColor / backgroundColor | ColorInput | black/white | Module colors |
| fallbackContent / fallbackColor | string/color | `""` / white | When too small to render |

## Gotchas

- Fallback indexes UTF-16 units one cell each — use BMP one-cell chars.
- For matrix/SVG/raw without a renderable → `--topic qr-encoder`.

## Related

`--topic qr-encoder`, `--topic image`, `--asset qr-code-basic`
