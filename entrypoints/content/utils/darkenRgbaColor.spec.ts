import { describe, expect, it } from 'vitest'
import { darkenRgbaColor } from './darkenRgbaColor'

describe('darkenRgbaColor', () => {
  it('darkens each RGB channel and preserves alpha', () => {
    const result = darkenRgbaColor({ r: 50, g: 80, b: 100, a: 0.6 }, 20)
    expect(result).toBe('rgba(30, 60, 80, 0.6)')
  })

  it('clamps channels at zero when amount exceeds channel value', () => {
    const result = darkenRgbaColor({ r: 10, g: 5, b: 0, a: 1 }, 25)
    expect(result).toBe('rgba(0, 0, 0, 1)')
  })
})
