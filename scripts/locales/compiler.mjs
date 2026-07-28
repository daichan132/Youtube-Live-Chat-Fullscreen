import { readdir, readFile } from 'node:fs/promises'

const assetsDir = new URL('../../shared/i18n/assets/', import.meta.url)
const languageNamesUrl = new URL('../../shared/i18n/language_codes.json', import.meta.url)

export const localeCodePattern = /^[a-z]{2,3}(?:_(?:[A-Z]{2}|\d{3}))?$/u
export const rtlBaseLocales = ['ar', 'fa', 'he']
export const runtimeKeysFile = '_keys.json'

const manifestMessageSources = {
  extensionName: 'extensionName',
  extensionDescription: 'extensionDescription',
  popup_theme: 'popup.theme',
  content_setting_theme: 'content.setting.theme',
  content_setting_themeMode_system: 'content.setting.themeMode.system',
  content_setting_themeMode_light: 'content.setting.themeMode.light',
  content_setting_themeMode_dark: 'content.setting.themeMode.dark',
}
const manifestOnlyKeys = new Set(['extensionName', 'extensionDescription'])

const flattenMessages = (value, prefix = '', output = {}) => {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flattenMessages(child, path, output)
    else if (typeof child === 'string' && child.trim()) output[path] = child
    else throw new Error(`Invalid locale value at ${path}`)
  }
  return output
}

const quote = value => `'${value}'`
const union = values => `\n${values.map(value => `  | ${quote(value)}`).join('\n')}`
const compactJson = value => `${JSON.stringify(value)}\n`
const arrayLines = values => `[\n${values.map(value => `  ${quote(value)},`).join('\n')}\n]`

const renderTranslationTypes = (localeCodes, translationKeys) =>
  `export type LocaleCode =${union(localeCodes)}\n\nexport type TranslationKey =${union(translationKeys)}\n\nexport type LocaleMessages = Readonly<Record<TranslationKey, string>>\n\nexport type LocaleState = {\n  code: LocaleCode\n  direction: 'ltr' | 'rtl'\n  messages: LocaleMessages\n}\n`

const renderLocaleMetadata = ({ localeCodes, languageNames }) => {
  const nameEntries = localeCodes
    .map(locale => `  ${locale}: ${quote(languageNames[locale].replaceAll('\\', '\\\\').replaceAll("'", "\\'"))},`)
    .join('\n')
  return `import type { LocaleCode } from './translationTypes'\n\nexport const localeCodes = ${arrayLines(localeCodes)} as const satisfies readonly LocaleCode[]\n\nexport const localeDisplayNames = {\n${nameEntries}\n} as const satisfies Readonly<Record<LocaleCode, string>>\n\nexport const rtlBaseLocales = [${rtlBaseLocales.map(quote).join(', ')}] as const\n`
}

export const compileLocales = async () => {
  const files = (await readdir(assetsDir)).filter(file => file.endsWith('.json')).sort()
  const localeCodes = files.map(file => file.slice(0, -5))
  const invalidLocale = localeCodes.find(locale => !localeCodePattern.test(locale))
  if (invalidLocale) throw new Error(`Invalid locale code: ${invalidLocale}`)
  if (!localeCodes.includes('en')) throw new Error('English locale source is required')

  const languageNames = JSON.parse(await readFile(languageNamesUrl, 'utf8'))
  const languageNameCodes = Object.keys(languageNames).sort()
  if (languageNameCodes.join('\0') !== localeCodes.join('\0')) {
    throw new Error('Language display names must match locale assets')
  }

  const messagesByLocale = new Map()
  for (const file of files) {
    const locale = file.slice(0, -5)
    messagesByLocale.set(locale, flattenMessages(JSON.parse(await readFile(new URL(file, assetsDir), 'utf8'))))
  }

  const sourceKeys = Object.keys(messagesByLocale.get('en')).sort()
  for (const [locale, messages] of messagesByLocale) {
    if (Object.keys(messages).sort().join('\0') !== sourceKeys.join('\0')) {
      throw new Error(`Locale keys differ: ${locale}`)
    }
  }
  const translationKeys = sourceKeys.filter(key => !manifestOnlyKeys.has(key))

  const runtimeFiles = new Map([[runtimeKeysFile, compactJson(translationKeys)]])
  const manifestFiles = new Map()
  for (const [locale, messages] of messagesByLocale) {
    runtimeFiles.set(`${locale}.json`, compactJson(translationKeys.map(key => messages[key])))
    const manifestMessages = Object.fromEntries(
      Object.entries(manifestMessageSources).map(([manifestKey, sourceKey]) => [
        manifestKey,
        { message: messages[sourceKey] },
      ]),
    )
    manifestFiles.set(`${locale}/messages.json`, `${JSON.stringify(manifestMessages, null, 2)}\n`)
  }

  return {
    localeCodes,
    translationKeys,
    runtimeFiles,
    manifestFiles,
    generatedFiles: new Map([
      ['translationTypes.ts', renderTranslationTypes(localeCodes, translationKeys)],
      ['localeMetadata.ts', renderLocaleMetadata({ localeCodes, languageNames })],
    ]),
  }
}
