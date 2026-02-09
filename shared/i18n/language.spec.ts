import { describe, expect, it } from 'vitest'
import { DEFAULT_LANGUAGE, normalizeLanguageCode, resolveLanguageCode } from './language'

describe('normalizeLanguageCode', () => {
  it('replaces hyphen with underscore', () => {
    expect(normalizeLanguageCode('pt-BR')).toBe('pt_BR')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeLanguageCode(undefined)).toBe('')
  })
})

describe('resolveLanguageCode', () => {
  it('returns exact language code when supported', () => {
    expect(resolveLanguageCode('ja')).toBe('ja')
  })

  it('normalizes a supported regional language code', () => {
    expect(resolveLanguageCode('pt-BR')).toBe('pt_BR')
  })

  it('falls back to base language when region is unsupported', () => {
    expect(resolveLanguageCode('fr-CA')).toBe('fr')
  })

  it('falls back to a regional variant when only regional variants exist', () => {
    expect(resolveLanguageCode('pt')).toBe('pt_BR')
  })

  it('falls back to default language for unknown code', () => {
    expect(resolveLanguageCode('xx-YY')).toBe(DEFAULT_LANGUAGE)
  })
})
