import { describe, expect, it } from 'vitest'
import { DEFAULT_LANGUAGE, getSupportedLanguageCodes, normalizeLanguageCode, resolveLanguageCode } from './language'

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

  // The cases below are the values browser.i18n.getUILanguage() actually reports.
  // Each one used to resolve to a bundle the user could not read.
  it.each([
    ['nb', 'no'],
    ['nb-NO', 'no'],
    ['nn', 'no'],
    ['iw', 'he'],
    ['in', 'id'],
    ['tl', 'fil'],
    ['mo', 'ro'],
    ['sh', 'sr'],
  ])('maps the browser code %s onto the bundled locale %s', (input, expected) => {
    expect(resolveLanguageCode(input)).toBe(expected)
  })

  it.each([
    ['zh-TW', 'zh_TW'],
    ['zh-HK', 'zh_TW'],
    ['zh-MO', 'zh_TW'],
    ['zh-Hant', 'zh_TW'],
    ['zh-Hant-HK', 'zh_TW'],
    ['zh-CN', 'zh_CN'],
    ['zh-Hans', 'zh_CN'],
    ['zh-SG', 'zh_CN'],
    ['zh', 'zh_CN'],
  ])('sends the Chinese code %s to the %s bundle', (input, expected) => {
    expect(resolveLanguageCode(input)).toBe(expected)
  })

  it.each([
    ['es-ES', 'es'],
    ['es-GQ', 'es'],
    ['es-MX', 'es_419'],
    ['es-AR', 'es_419'],
    ['es-CO', 'es_419'],
    ['es-US', 'es_419'],
  ])('sends the Spanish code %s to the %s bundle', (input, expected) => {
    expect(resolveLanguageCode(input)).toBe(expected)
  })

  it.each([
    ['pt-PT', 'pt_PT'],
    ['pt-AO', 'pt_PT'],
    ['pt-MZ', 'pt_PT'],
    ['pt-BR', 'pt_BR'],
  ])('sends the Portuguese code %s to the %s bundle', (input, expected) => {
    expect(resolveLanguageCode(input)).toBe(expected)
  })

  it.each([
    ['en-GB', 'en_GB'],
    ['en-AU', 'en_AU'],
    ['en-NZ', 'en_GB'],
    ['en-IE', 'en_GB'],
    ['en-ZA', 'en_GB'],
    ['en-CA', 'en'],
    ['en-US', 'en_US'],
  ])('sends the English code %s to the %s bundle', (input, expected) => {
    expect(resolveLanguageCode(input)).toBe(expected)
  })

  it('does not reach Object.prototype for tags that name its members', () => {
    expect(resolveLanguageCode('toString')).toBe(DEFAULT_LANGUAGE)
    expect(resolveLanguageCode('constructor')).toBe(DEFAULT_LANGUAGE)
  })

  it('still resolves every bundled locale to itself', () => {
    for (const code of getSupportedLanguageCodes()) {
      expect(resolveLanguageCode(code)).toBe(code)
      expect(resolveLanguageCode(code.replace('_', '-'))).toBe(code)
    }
  })
})
