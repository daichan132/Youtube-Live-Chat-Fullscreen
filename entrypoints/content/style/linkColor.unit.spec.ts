import { describe, expect, it } from 'vitest'
import type { RGBA } from '@/shared/settings/model'
import { getChatLinkColor } from './linkColor'

// Independent calculation from rendered sRGB channels. Do not import the
// production luminance/compositing helpers into their own contrast assertions.
const renderedContrast = (ink: RGBA, fill: RGBA, video: number) => {
  const composite = (channel: number) => channel * fill.a + video * (1 - fill.a)
  const surface = [composite(fill.r), composite(fill.g), composite(fill.b)] as const
  const renderedInk = [
    ink.r * ink.a + surface[0] * (1 - ink.a),
    ink.g * ink.a + surface[1] * (1 - ink.a),
    ink.b * ink.a + surface[2] * (1 - ink.a),
  ] as const
  const luminance = ([red, green, blue]: readonly [number, number, number]) => {
    const linear = (channel: number) => {
      const value = channel / 255
      return value > 0.04045 ? ((value + 0.055) / 1.055) ** 2.4 : value / 12.92
    }
    return linear(red) * 0.2126 + linear(green) * 0.7152 + linear(blue) * 0.0722
  }
  const inkLuminance = luminance(renderedInk)
  const backgroundLuminance = luminance(surface)
  return (Math.max(inkLuminance, backgroundLuminance) + 0.05) / (Math.min(inkLuminance, backgroundLuminance) + 0.05)
}

const LIGHT_INK: RGBA = { r: 247, g: 231, b: 255, a: 1 }
const DARK_INK: RGBA = { r: 42, g: 55, b: 76, a: 1 }

describe('chat link contrast', () => {
  it.each([
    { name: 'white', background: { r: 255, g: 255, b: 255, a: 1 }, foreground: DARK_INK },
    { name: 'dark', background: { r: 12, g: 16, b: 24, a: 0.94 }, foreground: LIGHT_INK },
    { name: 'lavender', background: { r: 48, g: 30, b: 72, a: 0.82 }, foreground: LIGHT_INK },
    { name: 'cream', background: { r: 249, g: 228, b: 194, a: 0.8 }, foreground: DARK_INK },
  ])('keeps $name links readable over black and white video frames', ({ background, foreground }) => {
    const link = getChatLinkColor(background, foreground)

    expect(renderedContrast(link, background, 0)).toBeGreaterThanOrEqual(4.5)
    expect(renderedContrast(link, background, 255)).toBeGreaterThanOrEqual(4.5)
    expect(link.a).toBe(1)
    expect(link.b).toBeGreaterThan(link.r)
    expect(link.b).toBeGreaterThan(link.g)
  })

  it.each([119, 128])('uses a readable fallback for opaque gray %s', channel => {
    const background: RGBA = { r: channel, g: channel, b: channel, a: 1 }
    const link = getChatLinkColor(background, LIGHT_INK)

    expect(renderedContrast(link, background, 0)).toBeGreaterThanOrEqual(4.5)
    expect(renderedContrast(link, background, 255)).toBeGreaterThanOrEqual(4.5)
    expect(link.a).toBe(1)
  })

  it('keeps readable link contrast across opaque grayscale and colored custom backgrounds', () => {
    const backgrounds: RGBA[] = Array.from({ length: 256 }, (_, value) => ({ r: value, g: value, b: value, a: 1 }))
    for (const r of [0, 51, 102, 153, 204, 255]) {
      for (const g of [0, 51, 102, 153, 204, 255]) {
        for (const b of [0, 51, 102, 153, 204, 255]) backgrounds.push({ r, g, b, a: 1 })
      }
    }

    for (const background of backgrounds) {
      const link = getChatLinkColor(background, DARK_INK)
      expect(renderedContrast(link, background, 0), `background ${JSON.stringify(background)}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('preserves the usual blue accents when the audited palettes already have sufficient contrast', () => {
    expect(getChatLinkColor({ r: 255, g: 255, b: 255, a: 1 }, DARK_INK)).toEqual({ r: 3, g: 66, b: 148, a: 1 })
    expect(getChatLinkColor({ r: 249, g: 228, b: 194, a: 0.8 }, DARK_INK)).toEqual({ r: 3, g: 66, b: 148, a: 1 })
    expect(getChatLinkColor({ r: 12, g: 16, b: 24, a: 0.94 }, LIGHT_INK)).toEqual({ r: 151, g: 204, b: 255, a: 1 })
    expect(getChatLinkColor({ r: 48, g: 30, b: 72, a: 0.82 }, LIGHT_INK)).toEqual({ r: 151, g: 204, b: 255, a: 1 })
  })

  it('follows the configured ink direction for a transparent background instead of its invisible RGB', () => {
    const blackFill: RGBA = { r: 0, g: 0, b: 0, a: 0 }
    const whiteFill: RGBA = { r: 255, g: 255, b: 255, a: 0 }
    const lightLink = getChatLinkColor(blackFill, LIGHT_INK)
    const darkLink = getChatLinkColor(blackFill, DARK_INK)

    expect(getChatLinkColor(whiteFill, LIGHT_INK)).toEqual(lightLink)
    expect(getChatLinkColor(whiteFill, DARK_INK)).toEqual(darkLink)
    expect(renderedContrast(lightLink, blackFill, 0)).toBeGreaterThanOrEqual(4.5)
    expect(renderedContrast(darkLink, blackFill, 255)).toBeGreaterThanOrEqual(4.5)
    // Transparency cannot guarantee contrast over the opposite video frame.
    expect(renderedContrast(lightLink, blackFill, 255)).toBeLessThan(4.5)
    expect(renderedContrast(darkLink, blackFill, 0)).toBeLessThan(4.5)
  })

  it('uses the better worst-case contrast rather than treating every colored fill as opaque', () => {
    const fill: RGBA = { r: 255, g: 255, b: 255, a: 0.5 }
    const selected = getChatLinkColor(fill, DARK_INK)
    const alternative: RGBA = { r: 151, g: 204, b: 255, a: 1 }
    const minimumContrast = (color: RGBA) => Math.min(renderedContrast(color, fill, 0), renderedContrast(color, fill, 255))

    expect(minimumContrast(selected)).toBeGreaterThan(minimumContrast(alternative))
  })
})
