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

  it('keeps extension descriptions within the Chrome 132-character limit', () => {
    const locales = readdirSync(publicLocalesDir).filter(localeDirName => localeDirName !== '.DS_Store')

    for (const locale of locales) {
      const description = loadLocaleMessages(locale).extensionDescription?.message ?? ''
      expect(description.length, `extensionDescription too long locale=${locale}`).toBeLessThanOrEqual(132)
    }
  })

  it('keeps manifest theme labels aligned with runtime translations', () => {
    const locales = readdirSync(publicLocalesDir).filter(localeDirName => localeDirName !== '.DS_Store')

    for (const locale of locales) {
      const messages = loadLocaleMessages(locale)
      const runtime = JSON.parse(readFileSync(join(assetsDir, `${locale}.json`), 'utf8')) as {
        content: { setting: { theme: string; themeMode: { system: string; light: string; dark: string } } }
        popup: { theme: string }
      }

      expect(messages.popup_theme?.message, `popup theme mismatch locale=${locale}`).toBe(runtime.popup.theme)
      expect(messages.content_setting_theme?.message, `content theme mismatch locale=${locale}`).toBe(runtime.content.setting.theme)
      expect(messages.content_setting_themeMode_system?.message, `system theme mismatch locale=${locale}`).toBe(
        runtime.content.setting.themeMode.system,
      )
      expect(messages.content_setting_themeMode_light?.message, `light theme mismatch locale=${locale}`).toBe(
        runtime.content.setting.themeMode.light,
      )
      expect(messages.content_setting_themeMode_dark?.message, `dark theme mismatch locale=${locale}`).toBe(
        runtime.content.setting.themeMode.dark,
      )
    }
  })

  it('does not keep extensionDescription as English in non-English locales', () => {
    const englishDesc = loadLocaleMessages('en').extensionDescription?.message ?? ''
    const locales = readdirSync(publicLocalesDir).filter(localeDirName => localeDirName !== '.DS_Store')

    for (const locale of locales) {
      if (ENGLISH_FAMILY.has(locale)) continue
      const desc = loadLocaleMessages(locale).extensionDescription?.message ?? ''
      expect(desc, `untranslated extensionDescription locale=${locale}`).not.toBe(englishDesc)
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
