import languageCodes from './language_codes.json'

export const DEFAULT_LANGUAGE = 'en'

const supportedLanguageCodeList = Object.keys(languageCodes)
const supportedLanguageCodes = new Set(supportedLanguageCodeList)

export const normalizeLanguageCode = (languageCode?: string | null) => {
  if (!languageCode) return ''
  return languageCode.replaceAll('-', '_')
}

export const resolveLanguageCode = (languageCode?: string | null) => {
  const normalizedLanguageCode = normalizeLanguageCode(languageCode)

  if (!normalizedLanguageCode) {
    return DEFAULT_LANGUAGE
  }

  if (supportedLanguageCodes.has(normalizedLanguageCode)) {
    return normalizedLanguageCode
  }

  const [baseLanguageCode] = normalizedLanguageCode.split('_')

  if (!baseLanguageCode) {
    return DEFAULT_LANGUAGE
  }

  if (supportedLanguageCodes.has(baseLanguageCode)) {
    return baseLanguageCode
  }

  const regionalVariant = supportedLanguageCodeList.find(code => code.startsWith(`${baseLanguageCode}_`))
  return regionalVariant ?? DEFAULT_LANGUAGE
}

export const getSupportedLanguageCodes = () => supportedLanguageCodeList
