import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ENGLISH_FAMILY = new Set(['en', 'en_AU', 'en_GB', 'en_US'])
const ENGLISH_KEY_ALLOWLIST = new Set([
  'content.setting.footer.chrome',
  'content.setting.footer.firefox',
  'content.aria.dragToMove',
  'content.aria.arrowKeysToMove',
  'content.aria.openSettings',
  'content.aria.toggleLiveChat',
  'content.aria.close',
  'content.aria.reorderPreset',
  'content.aria.presetName',
  'content.aria.applyPreset',
  'content.aria.deletePreset',
  'content.aria.colorPicker',
  'content.aria.loading',
  'content.aria.selectLanguage',
])
const ENGLISH_STRING_WHITELIST = new Set([
  'ca:content.preset.transparentTitle',
  'ca:content.preset.simpleTitle',
  'da:popup.links',
  'de:content.preset.transparentTitle',
  'es_419:content.preset.simpleTitle',
  'fil:content.preset.transparentTitle',
  'fil:content.preset.simpleTitle',
  'fr:content.preset.transparentTitle',
  'fr:content.preset.simpleTitle',
  'pt_BR:popup.links',
  'pt_PT:popup.links',
  'ro:content.preset.transparentTitle',
  'sv:content.preset.transparentTitle',
])

const assetsDir = join(dirname(fileURLToPath(import.meta.url)), 'assets')

const localeFiles = readdirSync(assetsDir)
  .filter(fileName => fileName.endsWith('.json'))
  .sort()

const loadLocaleAsset = (fileName: string) => JSON.parse(readFileSync(join(assetsDir, fileName), 'utf8')) as Record<string, unknown>

const flattenObject = (value: Record<string, unknown>, prefix = ''): Map<string, string> => {
  const entries = new Map<string, string>()

  for (const [key, nextValue] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key
    if (nextValue && typeof nextValue === 'object' && !Array.isArray(nextValue)) {
      const nestedEntries = flattenObject(nextValue as Record<string, unknown>, nextKey)
      for (const [nestedKey, nestedValue] of nestedEntries) {
        entries.set(nestedKey, nestedValue)
      }
      continue
    }
    entries.set(nextKey, String(nextValue ?? ''))
  }

  return entries
}

describe('i18n assets', () => {
  it('keeps the same key set across all locales', () => {
    const baseLocale = loadLocaleAsset('en.json')
    const baseKeys = new Set(flattenObject(baseLocale).keys())

    for (const fileName of localeFiles) {
      const locale = fileName.replace('.json', '')
      const localeKeys = new Set(flattenObject(loadLocaleAsset(fileName)).keys())
      expect(localeKeys, `key mismatch locale=${locale}`).toEqual(baseKeys)
    }
  })

  it('does not contain empty translated strings', () => {
    for (const fileName of localeFiles) {
      const locale = fileName.replace('.json', '')
      const flattened = flattenObject(loadLocaleAsset(fileName))
      for (const [key, value] of flattened) {
        expect(value.trim().length, `empty translation locale=${locale} key=${key}`).toBeGreaterThan(0)
      }
    }
  })

  it('does not leave preset default title as English in non-English locales', () => {
    for (const fileName of localeFiles) {
      const locale = fileName.replace('.json', '')
      if (ENGLISH_FAMILY.has(locale)) continue
      const flattened = flattenObject(loadLocaleAsset(fileName))
      expect(flattened.get('content.preset.defaultTitle'), `untranslated default title locale=${locale}`).not.toBe('Default')
    }
  })

  it('does not leave disallowed English strings in non-English locales', () => {
    const englishMap = flattenObject(loadLocaleAsset('en.json'))

    for (const fileName of localeFiles) {
      const locale = fileName.replace('.json', '')
      if (ENGLISH_FAMILY.has(locale)) continue

      const flattened = flattenObject(loadLocaleAsset(fileName))
      const leftovers: string[] = []

      for (const [key, value] of flattened) {
        const englishValue = englishMap.get(key)
        if (!englishValue || value !== englishValue) continue
        if (ENGLISH_KEY_ALLOWLIST.has(key)) continue
        if (ENGLISH_STRING_WHITELIST.has(`${locale}:${key}`)) continue
        leftovers.push(key)
      }

      expect(leftovers, `untranslated English leftovers locale=${locale}`).toEqual([])
    }
  })
})
