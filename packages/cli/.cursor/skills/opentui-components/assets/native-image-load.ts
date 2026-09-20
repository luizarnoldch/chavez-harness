import { NativeImage } from "@opentui/core"

const image = await NativeImage.load("./image.webp")

try {
  const raw = image.raw("rgba8")
  console.log(raw.width, raw.height, raw.stride, raw.data.byteLength)

  const thumbnail = image.resize({ width: 320 })
  try {
    console.log(thumbnail.width, thumbnail.height)
  } finally {
    thumbnail.dispose()
  }
} finally {
  image.dispose()
}
