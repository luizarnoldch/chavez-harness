# NativeImage

Decode, transform pixels, and own native image handles. Image owns display/protocol; NativeImage owns pixels. Dispose every handle.

## Load and dispose

```ts
const image = await NativeImage.load("./image.webp")
try {
  const raw = image.raw("rgba8")
} finally {
  image.dispose()
}
```

## Sources

| API | Input |
|-----|-------|
| `NativeImage.load` | path, file:/http(s)/blob:/data: URL, URL, Blob, Response, bytes |
| `NativeImage.decode` | encoded Uint8Array/ArrayBuffer |
| `NativeImage.fromRgba` | RGBA8 pixels |
| `NativeImage.fromPixels` | RGBA8/BGRA8 with options |
| `imageInfo` | metadata without retaining handle |

Format detection reads encoded bytes (not filename/extension).

## Pixel import options

`stride?`, `format?: "rgba8"|"bgra8"`, `alpha?: "straight"|"opaque"`, `colorSpace?: "srgb"`.

## Ownership APIs

| Method | Behavior |
|--------|----------|
| raw / copyTo | Copy pixels out |
| takeRaw | Transfer exclusive ownership → OwnedRawImage (dispose required) |
| retain | Extra handle, same native image |
| clone | New image with copied storage |
| dispose | Idempotent release of one handle |

## Transforms (return new NativeImage)

`resize`, `extract`, `extend`, `rotate(90|180|270)`, `flip`, `flop`, `composite`.

## NativeImagePool

Fixed-size slot pool for same dimensions. `publishRgba` / `publishPixels` return null if all slots busy. Dispose frames and pool.

## Limits

Encoded 64 MiB; max dimension 16384; 25M pixels; 100 MiB RGBA per image.

## Related

`--topic image`, `--topic framebuffer`, `--asset native-image-load`
