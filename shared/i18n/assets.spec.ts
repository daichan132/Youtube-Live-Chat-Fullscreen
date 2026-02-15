import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

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
})
