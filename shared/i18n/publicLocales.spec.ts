import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ENGLISH_FAMILY = new Set(['en', 'en_AU', 'en_GB', 'en_US'])

type LocaleMessageEntry = {
  message?: string
}

type LocaleMessageFile = Record<string, LocaleMessageEntry | undefined>

const i18nDir = dirname(fileURLToPath(import.meta.url))
const assetsDir = join(i18nDir, 'assets')
const publicLocalesDir = join(i18nDir, '..', '..', 'public', '_locales')

const localeFromFileName = (fileName: string) => fileName.replace(/\.json$/u, '')

const localeFromMessagesPath = (localeDirName: string) => localeDirName

const loadLocaleMessages = (locale: string) =>
  JSON.parse(readFileSync(join(publicLocalesDir, locale, 'messages.json'), 'utf8')) as LocaleMessageFile

describe('public locale messages', () => {
  it('keeps locale set aligned between shared assets and public locales', () => {
    const assetLocales = readdirSync(assetsDir)
      .filter(fileName => fileName.endsWith('.json'))
      .map(localeFromFileName)
      .sort()

    const publicLocales = readdirSync(publicLocalesDir)
      .filter(localeDirName => localeDirName !== '.DS_Store')
      .map(localeFromMessagesPath)
      .sort()

    expect(publicLocales).toEqual(assetLocales)
  })

  it('has non-empty extensionName and extensionDescription in all locales', () => {
    const locales = readdirSync(publicLocalesDir).filter(localeDirName => localeDirName !== '.DS_Store')

    for (const locale of locales) {
      const messages = loadLocaleMessages(locale)
      const extensionName = messages.extensionName?.message?.trim() ?? ''
      const extensionDescription = messages.extensionDescription?.message?.trim() ?? ''
      expect(extensionName.length, `missing extensionName locale=${locale}`).toBeGreaterThan(0)
      expect(extensionDescription.length, `missing extensionDescription locale=${locale}`).toBeGreaterThan(0)
    }
  })

  it('does not keep extensionName as English in non-English locales', () => {
    const englishName = loadLocaleMessages('en').extensionName?.message ?? ''
    const locales = readdirSync(publicLocalesDir).filter(localeDirName => localeDirName !== '.DS_Store')

    for (const locale of locales) {
      if (ENGLISH_FAMILY.has(locale)) continue
      const extensionName = loadLocaleMessages(locale).extensionName?.message ?? ''
      expect(extensionName, `untranslated extensionName locale=${locale}`).not.toBe(englishName)
    }
  })

  it('uses only valid Chrome extension message keys', () => {
    const locales = readdirSync(publicLocalesDir).filter(localeDirName => localeDirName !== '.DS_Store')
    const keyPattern = /^[A-Za-z0-9_]+$/u

    for (const locale of locales) {
      const messages = loadLocaleMessages(locale)
      const invalidKeys = Object.keys(messages).filter(key => !keyPattern.test(key))
      expect(invalidKeys, `invalid message key locale=${locale}`).toEqual([])
    }
  })
})
