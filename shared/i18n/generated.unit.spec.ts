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

const flattenMessages = (value: Record<string, unknown>, prefix = '', output: Record<string, string> = {}) => {
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flattenMessages(child as Record<string, unknown>, next, output)
    else if (typeof child === 'string') output[next] = child
    else throw new Error(`Invalid source message at ${next}`)
  }
  return output
}

const flattenKeys = (value: Record<string, unknown>) => Object.keys(flattenMessages(value)).sort()
const sourceLocales = readdirSync(assetsDir)
  .filter(file => file.endsWith('.json'))
  .sort()
const readRuntimeArray = (file: string) => JSON.parse(readFileSync(join(generatedDir, file), 'utf8')) as unknown[]

describe('generated i18n contract', () => {
  it('parses every generated JSON file and preserves the source key set', () => {
    const sourceKeys = flattenKeys(JSON.parse(readFileSync(join(assetsDir, 'en.json'), 'utf8'))).filter(key => !MANIFEST_ONLY_KEYS.has(key))
    const generatedKeys = JSON.parse(readFileSync(join(generatedDir, '_keys.json'), 'utf8')) as string[]
    expect(generatedKeys).toEqual(sourceKeys)
    for (const file of readdirSync(generatedDir)) {
      expect(statSync(join(generatedDir, file)).isFile(), file).toBe(true)
      if (file === '_keys.json') continue
      if (file !== '_defaults.json') expect(file).toMatch(/^[a-z]{2,3}(?:_(?:[A-Z]{2}|\d{3}))?\.json$/u)
      const generated = readRuntimeArray(file)
      expect(generated).toHaveLength(sourceKeys.length)
      expect(
        generated.every(message => typeof message === 'string' || (file !== '_defaults.json' && message === null)),
        file,
      ).toBe(true)
    }
  })

  it('reconstructs every authored message without dropping any locale', () => {
    expect(readdirSync(generatedDir).sort()).toEqual(['_keys.json', '_defaults.json', ...sourceLocales].sort())
    const keys = readRuntimeArray('_keys.json') as string[]
    const defaults = readRuntimeArray('_defaults.json') as string[]
    expect(sourceLocales).toHaveLength(55)
    let sharedEntries = 0
    for (const locale of sourceLocales) {
      const source = flattenMessages(JSON.parse(readFileSync(join(assetsDir, locale), 'utf8')))
      const encoded = readRuntimeArray(locale)
      const decoded = encoded.map((message, index) => (message === null ? defaults[index] : message))
      expect(decoded, locale).toEqual(keys.map(key => source[key]))
      sharedEntries += encoded.filter(message => message === null).length
    }
    expect(sharedEntries).toBeGreaterThan(0)
  })

  it('shares the most frequent exact text with stable ties instead of replacing translated wording', () => {
    const keys = readRuntimeArray('_keys.json') as string[]
    const defaults = readRuntimeArray('_defaults.json') as string[]
    const sources = sourceLocales.map(locale => flattenMessages(JSON.parse(readFileSync(join(assetsDir, locale), 'utf8'))))
    const english = flattenMessages(JSON.parse(readFileSync(join(assetsDir, 'en.json'), 'utf8')))
    for (const [index, key] of keys.entries()) {
      const texts = sources.map(source => source[key])
      const counts = new Map<string | undefined, number>()
      for (const text of texts) counts.set(text, (counts.get(text) ?? 0) + 1)
      const highest = Math.max(...counts.values())
      const expected = counts.get(english[key]) === highest ? english[key] : texts.find(text => counts.get(text) === highest)
      expect(defaults[index], key).toBe(expected)
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
