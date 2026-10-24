import { describe, expect, it } from 'vitest'
import { getControlPalette } from './controlPalette'

describe('chat-colored controls', () => {
  it('retains a readable custom background and ink instead of the UI theme', () => {
    expect(getControlPalette({ r: 24, g: 32, b: 52, a: 1 }, { r: 224, g: 232, b: 248, a: 0.2 })).toEqual({
      '--ylc-overlay-control-rail-bg': 'rgba(24, 32, 52, 1)',
      '--ylc-overlay-control-ink': 'rgba(224, 232, 248, 1)',
      '--ylc-overlay-control-hover': 'rgba(224, 232, 248, 0.1)',
    })
  })
  it.each([
    [255, 'rgba(0, 0, 0, 1)'],
    [0, 'rgba(255, 255, 255, 1)'],
  ])('recovers invisible same-color controls on channel %s', (channel, ink) => {
    const color = { r: channel, g: channel, b: channel, a: 0 }
    const palette = getControlPalette(color, color)
    expect(palette['--ylc-overlay-control-rail-bg']).toBe(`rgba(${channel}, ${channel}, ${channel}, 1)`)
    expect(palette['--ylc-overlay-control-ink']).toBe(ink)
  })
})
