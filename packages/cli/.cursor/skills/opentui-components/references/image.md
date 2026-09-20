# Image

Displays PNG, JPEG, WebP, or GIF from an encoded source, or an existing NativeImage. Protocols: Kitty, Sixel, or Unicode blocks.

## Availability

| Field | Value |
|-------|-------|
| Package | `@opentui/core` |
| Core | ImageRenderable |
| React | `<image>` (automatic) |
| Solid | `<image>` (automatic) |
| Status | Built in |

## Key options / state

| Member | Type | Notes |
|--------|------|-------|
| source | path/URL/Blob/bytes/NativeImage | Encoded or native |
| fit | `"fit"` \| `"cover"` \| `"fill"` | Default `"fit"` |
| protocol | `"auto"` \| `"kitty"` \| `"sixel"` \| `"blocks"` | Default `"auto"` |
| onLoad / onError | callbacks | Load lifecycle |
| image | NativeImage \| null | Owned by renderable — do not dispose |
| loading / loadError / loadPromise | state | Await `loadPromise` before scrollback |
| effectiveProtocol | resolved | Can change with caps/size |

## Fit behavior

- `fit` — contain and center, preserve aspect
- `cover` — fill and center-crop
- `fill` — stretch to fill

## Protocol notes

`auto`: global override → Kitty → Sixel → blocks. Overlapping images must share the same effective protocol. Env: `OPENTUI_IMAGE_PROTOCOL`, `OPENTUI_GRAPHICS=false`.

Kitty transport (`raw`/`zlib`/`file`) is renderer-level, not per-image protocol.

## Ownership

Renderable owns `image` and the NativeImage passed to `onLoad`. Do not dispose them. You still dispose NativeImage you pass as `source` if you created it.

## Related

`--topic native-image`, `--topic framebuffer`, `--asset image-load`
