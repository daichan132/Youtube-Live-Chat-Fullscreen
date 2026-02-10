import { describe, expect, it } from 'vitest'
import { ALLOWED_FONT_FAMILIES, isAllowedFontFamily, normalizeFontFamily } from './fontFamilyPolicy'

describe('fontFamilyPolicy', () => {
  it('keeps exactly 50 allowed web font families', () => {
    expect(ALLOWED_FONT_FAMILIES).toHaveLength(50)
  })

  it('normalizes case and whitespace to canonical font family', () => {
    expect(normalizeFontFamily('  roboto   slab ')).toBe('Roboto Slab')
    expect(normalizeFontFamily('ZEN   MARU   GOTHIC')).toBe('Zen Maru Gothic')
  })

  it('returns default for invalid or empty values', () => {
    expect(normalizeFontFamily('')).toBe('')
    expect(normalizeFontFamily('NotInListFont')).toBe('')
    expect(normalizeFontFamily(null)).toBe('')
  })

  it('can detect if a font family is allowed', () => {
    expect(isAllowedFontFamily('Roboto')).toBe(true)
    expect(isAllowedFontFamily('roboto')).toBe(true)
    expect(isAllowedFontFamily('NotInListFont')).toBe(false)
  })
})
