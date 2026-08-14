import { inflateSync } from 'node:zlib'

export type PixelImage = {
  width: number
  height: number
  channels: 3 | 4
  pixels: Uint8Array
}

export type PixelRect = { x: number; y: number; width: number; height: number }

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

const byteAt = (bytes: Uint8Array, index: number, context: string) => {
  const value = bytes[index]
  if (value === undefined) throw new Error(`${context} is truncated at byte ${index}.`)
  return value
}

export const decodePng = (png: Buffer): PixelImage => {
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('Screenshot is not a PNG image.')

  let offset = 8
  let width = 0
  let height = 0
  let channels: 3 | 4 = 4
  const imageData: Buffer[] = []
  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString('ascii')
    const data = png.subarray(offset + 8, offset + 8 + length)
    offset += length + 12
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      if (data[8] !== 8 || data[12] !== 0) throw new Error('Only 8-bit, non-interlaced PNG screenshots are supported.')
      if (data[9] === 2) channels = 3
      else if (data[9] === 6) channels = 4
      else throw new Error(`Unsupported PNG color type: ${data[9]}`)
    } else if (type === 'IDAT') imageData.push(data)
    else if (type === 'IEND') break
  }
  if (width === 0 || height === 0 || imageData.length === 0) throw new Error('PNG image data is incomplete.')

  const filtered = inflateSync(Buffer.concat(imageData))
  const stride = width * channels
  const expectedFilteredLength = (stride + 1) * height
  if (filtered.length !== expectedFilteredLength) {
    throw new Error(`PNG image data has ${filtered.length} bytes; expected ${expectedFilteredLength}.`)
  }
  const pixels = new Uint8Array(stride * height)
  const paeth = (left: number, above: number, upperLeft: number) => {
    const prediction = left + above - upperLeft
    const leftDistance = Math.abs(prediction - left)
    const aboveDistance = Math.abs(prediction - above)
    const upperLeftDistance = Math.abs(prediction - upperLeft)
    return leftDistance <= aboveDistance && leftDistance <= upperLeftDistance
      ? left
      : aboveDistance <= upperLeftDistance
        ? above
        : upperLeft
  }

  for (let y = 0; y < height; y += 1) {
    const filter = byteAt(filtered, y * (stride + 1), 'PNG image data')
    const rowOffset = y * stride
    const sourceOffset = y * (stride + 1) + 1
    for (let x = 0; x < stride; x += 1) {
      const raw = byteAt(filtered, sourceOffset + x, 'PNG image data')
      const left = x >= channels ? byteAt(pixels, rowOffset + x - channels, 'Decoded PNG') : 0
      const above = y > 0 ? byteAt(pixels, rowOffset + x - stride, 'Decoded PNG') : 0
      const upperLeft = y > 0 && x >= channels ? byteAt(pixels, rowOffset + x - stride - channels, 'Decoded PNG') : 0
      const predictor =
        filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? above : filter === 3 ? (left + above) >> 1 : paeth(left, above, upperLeft)
      if (filter < 0 || filter > 4) throw new Error(`Unsupported PNG row filter: ${filter}`)
      pixels[rowOffset + x] = (raw + predictor) & 0xff
    }
  }

  return { width, height, channels, pixels }
}

const assertRect = (image: PixelImage, rect: PixelRect) => {
  if (
    rect.width < 2 ||
    rect.height < 2 ||
    rect.x < 0 ||
    rect.y < 0 ||
    rect.x + rect.width > image.width ||
    rect.y + rect.height > image.height
  ) {
    throw new Error(`Pixel sample is outside the screenshot: ${JSON.stringify(rect)} in ${image.width}x${image.height}`)
  }
}

const lumaAt = (image: PixelImage, x: number, y: number) => {
  const offset = (y * image.width + x) * image.channels
  return (
    byteAt(image.pixels, offset, 'Pixel image') * 0.299 +
    byteAt(image.pixels, offset + 1, 'Pixel image') * 0.587 +
    byteAt(image.pixels, offset + 2, 'Pixel image') * 0.114
  )
}

export const edgeEnergy = (image: PixelImage, rect: PixelRect) => {
  assertRect(image, rect)
  let energy = 0
  let edges = 0
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const current = lumaAt(image, x, y)
      if (x + 1 < rect.x + rect.width) {
        energy += Math.abs(current - lumaAt(image, x + 1, y))
        edges += 1
      }
      if (y + 1 < rect.y + rect.height) {
        energy += Math.abs(current - lumaAt(image, x, y + 1))
        edges += 1
      }
    }
  }
  return energy / edges
}

export const meanPixelDifference = (left: PixelImage, right: PixelImage, rect: PixelRect) => {
  assertRect(left, rect)
  assertRect(right, rect)
  if (left.width !== right.width || left.height !== right.height || left.channels !== right.channels) {
    throw new Error('Screenshots must have identical dimensions and color formats.')
  }
  let difference = 0
  let samples = 0
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const offset = (y * left.width + x) * left.channels
      for (let channel = 0; channel < 3; channel += 1) {
        difference += Math.abs(
          byteAt(left.pixels, offset + channel, 'Left pixel image') - byteAt(right.pixels, offset + channel, 'Right pixel image'),
        )
        samples += 1
      }
    }
  }
  return difference / samples
}
