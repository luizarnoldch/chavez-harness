# QR encoder

Standalone QR Model 2 encoder in `@opentui/qrcode` root. Use for matrices, terminal strings, SVG, segments, ECI, GS1/FNC1, structured append — not display.

## Install

`bun add @opentui/qrcode`

## Encode text

```ts
import { ErrorCorrectionLevel, QRCode } from "@opentui/qrcode"
const qr = QRCode.encodeText("https://opentui.com", ErrorCorrectionLevel.M)
```

## EncodeOptions (defaults)

`minVersion` 1, `maxVersion` 40, `mask` auto, `boostEcl` true, `optimize` true, `kanji` false, `byteEncoding` `"utf-8"`, `eciForUtf8` true for UTF-8 bytes.

## Other encoders

`encodeBytes`, `encodeEciText`, `encodeGs1Text`, `encodeSegments`, `encodeStructuredAppend` (2–16 parts).

## Segment helpers (`QrSegment`)

`makeNumeric`, `makeAlphanumeric`, `makeBytes`, `makeBytesFromText`, `makeKanji`, `makeEci`, `makeFnc1*`, `makeStructuredAppendHeader`, `makeSegments`, `makeOptimizedSegments`.

## Output

| Method | Notes |
|--------|-------|
| toMatrix() | `boolean[][]`, true = dark |
| toTerminalString({ border, ansi, invert }) | border ≥ 4; 2 cols × 1 row per module |
| toSvgString({ border, moduleSize, lightColor, darkColor }) | border ≥ 4 |
| createQrSvg(text, opts) | Shortcut |

## Instance metadata

`version`, `size`, `errorCorrectionLevel`, `mask`, `containsEci`, `fnc1`, `symbologyIdentifier`, `getModule(x,y)`.

## Limits

Versions 1–40 Model 2 only. No decode. No Model 1 / rMQR.

## Related

`--topic qr-code`, `--asset qr-encode-terminal`
