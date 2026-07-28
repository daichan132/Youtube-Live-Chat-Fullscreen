import { localeCodes } from './generated/localeMetadata'
import type { LocaleCode } from './generated/translationTypes'

export type { LocaleCode }

export const DEFAULT_LANGUAGE = 'en'

const supportedLanguageCodeList: readonly LocaleCode[] = localeCodes
const supportedLanguageCodes = new Set<string>(supportedLanguageCodeList)

export const normalizeLanguageCode = (languageCode?: string | null) => {
  if (!languageCode) return ''
  return languageCode.replaceAll('-', '_')
}

export const resolveLanguageCode = (languageCode?: string | null): LocaleCode => {
  const normalizedLanguageCode = normalizeLanguageCode(languageCode)

  if (!normalizedLanguageCode) {
    return DEFAULT_LANGUAGE
  }

  if (supportedLanguageCodes.has(normalizedLanguageCode)) {
    return normalizedLanguageCode as LocaleCode
  }

  const [baseLanguageCode] = normalizedLanguageCode.split('_')

  if (!baseLanguageCode) {
    return DEFAULT_LANGUAGE
  }

  if (supportedLanguageCodes.has(baseLanguageCode)) {
    return baseLanguageCode as LocaleCode
  }

  const regionalVariant = supportedLanguageCodeList.find(code => code.startsWith(`${baseLanguageCode}_`))
  return (regionalVariant ?? DEFAULT_LANGUAGE) as LocaleCode
}

export const getSupportedLanguageCodes = () => supportedLanguageCodeList
