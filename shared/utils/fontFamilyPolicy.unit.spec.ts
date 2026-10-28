import { describe, expect, it } from 'vitest'
import { normalizeFontFamily } from './fontFamilyPolicy'

describe('fontFamilyPolicy', () => {
  it('normalizes case and whitespace to canonical font family', () => {
    expect(normalizeFontFamily('  roboto   slab ')).toBe('Roboto Slab')
    expect(normalizeFontFamily('ZEN   MARU   GOTHIC')).toBe('Zen Maru Gothic')
  })

  it('returns default for invalid or empty values', () => {
    expect(normalizeFontFamily('')).toBe('')
    expect(normalizeFontFamily('NotInListFont')).toBe('')
    expect(normalizeFontFamily(null)).toBe('')
  })
})
