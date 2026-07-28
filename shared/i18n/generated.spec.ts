import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { getSupportedLanguageCodes } from './language'
import { isRTL } from './rtl'

const i18nDir = dirname(fileURLToPath(import.meta.url))
const assetsDir = join(i18nDir, 'assets')
const generatedDir = join(i18nDir, '..', '..', 'public', 'locales')
const typesSource = readFileSync(join(i18nDir, 'generated', 'translationTypes.ts'), 'utf8')
const MANIFEST_ONLY_KEYS = new Set(['extensionName', 'extensionDescription'])

const flattenKeys = (value: Record<string, unknown>, prefix = '', output: string[] = []) => {
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flattenKeys(child as Record<string, unknown>, next, output)
    else output.push(next)
  }
  return output.sort()
}

describe('generated i18n contract', () => {
  it('parses every generated JSON file and preserves the source key set', () => {
    const sourceKeys = flattenKeys(JSON.parse(readFileSync(join(assetsDir, 'en.json'), 'utf8'))).filter(key => !MANIFEST_ONLY_KEYS.has(key))
    const generatedKeys = JSON.parse(readFileSync(join(generatedDir, '_keys.json'), 'utf8')) as string[]
    expect(generatedKeys).toEqual(sourceKeys)
    for (const file of readdirSync(generatedDir)) {
      expect(statSync(join(generatedDir, file)).isFile(), file).toBe(true)
      if (file === '_keys.json') continue
      expect(file).toMatch(/^[a-z]{2,3}(?:_(?:[A-Z]{2}|\d{3}))?\.json$/u)
      const generated = JSON.parse(readFileSync(join(generatedDir, file), 'utf8')) as unknown[]
      expect(generated).toHaveLength(sourceKeys.length)
      expect(
        generated.every(message => typeof message === 'string'),
        file,
      ).toBe(true)
    }
  })

  it('keeps generated LocaleCode and TranslationKey declarations aligned with source', () => {
    for (const locale of getSupportedLanguageCodes()) expect(typesSource).toContain(`'${locale}'`)
    const sourceKeys = flattenKeys(JSON.parse(readFileSync(join(assetsDir, 'en.json'), 'utf8'))).filter(key => !MANIFEST_ONLY_KEYS.has(key))
    for (const key of sourceKeys) expect(typesSource).toContain(`'${key}'`)
    expect(typesSource).toContain('export type TranslationKey =')
  })

  it('keeps right-to-left direction classification explicit', () => {
    expect(isRTL('ar')).toBe(true)
    expect(isRTL('fa')).toBe(true)
    expect(isRTL('he')).toBe(true)
    expect(isRTL('en_US')).toBe(false)
    expect(isRTL('ja')).toBe(false)
  })
})
