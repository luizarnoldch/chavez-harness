import { ErrorCorrectionLevel, QRCode } from "@opentui/qrcode"

const qr = QRCode.encodeText("https://opentui.com", ErrorCorrectionLevel.M)

console.log(`version=${qr.version} size=${qr.size} mask=${qr.mask}`)
console.log(
  qr.toTerminalString({
    border: 4,
    ansi: true,
    invert: false,
  }),
)
