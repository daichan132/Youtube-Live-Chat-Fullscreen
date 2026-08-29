import { localeCodes } from './generated/localeMetadata'
import type { LocaleCode } from './generated/translationTypes'

export type { LocaleCode }

export const DEFAULT_LANGUAGE = 'en'

const supportedLanguageCodeList: readonly LocaleCode[] = localeCodes
const supportedLanguageCodes = new Set<string>(supportedLanguageCodeList)

/**
 * Bundles whose directory name differs from the language subtag browsers report.
 * Intl canonicalises the superseded ISO codes on its own (iw to he, in to id, tl to fil,
 * mo to ro, sh to sr), so only genuine naming mismatches belong here. A Map rather than an
 * object literal, so a tag such as "toString" cannot reach Object.prototype.
 */
const BUNDLE_ALIASES = new Map<string, string>([
  ['nb', 'no'], // Chrome reports Norwegian Bokmal as nb; the bundle is named no
  ['nn', 'no'], // Nynorsk shares that bundle
])

/** Spanish regions served by the Peninsular bundle. Everywhere else takes es_419. */
const PENINSULAR_SPANISH_REGIONS = new Set(['es', 'gq'])
/** English regions whose spelling follows en_GB more closely than the default bundle. */
const COMMONWEALTH_ENGLISH_REGIONS = new Set(['ie', 'in', 'nz', 'sg', 'za'])

type LanguageParts = { language: string; script: string; region: string }

/**
 * Expands a language tag through CLDR's likely-subtag data, which is what knows that
 * zh-HK is Traditional while zh-SG is Simplified. Intl.Locale needs BCP47 hyphens and
 * throws on malformed input, so callers fall back to naive parsing when this returns null.
 */
const maximizeLanguageTag = (normalizedLanguageCode: string): LanguageParts | null => {
  try {
    const locale = new Intl.Locale(normalizedLanguageCode.replaceAll('_', '-')).maximize()
    return {
      language: locale.language.toLowerCase(),
      script: (locale.script ?? '').toLowerCase(),
      region: (locale.region ?? '').toLowerCase(),
    }
  } catch {
    return null
  }
}

const parseLanguageTag = (normalizedLanguageCode: string): LanguageParts => {
  const [language = '', ...subtags] = normalizedLanguageCode.split('_')
  const lowered = subtags.map(subtag => subtag.toLowerCase())
  return {
    language: language.toLowerCase(),
    script: lowered.find(subtag => subtag.length === 4) ?? '',
    region: lowered.find(subtag => subtag.length !== 4) ?? '',
  }
}

/** Picks between bundles for the languages we ship as several script or regional variants. */
const resolveVariant = ({ language, script, region }: LanguageParts): string | null => {
  if (language === 'zh') return script === 'hant' ? 'zh_TW' : 'zh_CN'
  if (language === 'pt') return region === 'br' ? 'pt_BR' : 'pt_PT'
  if (language === 'es') return PENINSULAR_SPANISH_REGIONS.has(region) ? 'es' : 'es_419'
  if (language === 'en' && COMMONWEALTH_ENGLISH_REGIONS.has(region)) return 'en_GB'
  return null
}

export const normalizeLanguageCode = (languageCode?: string | null) => {
  if (!languageCode) return ''
  return languageCode.replaceAll('-', '_')
}

/**
 * Returns the bundle for a tag, or null when nothing we ship matches it. Callers that need
 * a value use resolveLanguageCode; callers walking a preference list need the null so they
 * can try the next entry instead of stopping at the English default.
 */
export const matchLanguageCode = (languageCode?: string | null): LocaleCode | null => {
  const normalizedLanguageCode = normalizeLanguageCode(languageCode)

  if (!normalizedLanguageCode) {
    return null
  }

  if (supportedLanguageCodes.has(normalizedLanguageCode)) {
    return normalizedLanguageCode as LocaleCode
  }

  const parts = maximizeLanguageTag(normalizedLanguageCode) ?? parseLanguageTag(normalizedLanguageCode)
  const language = BUNDLE_ALIASES.get(parts.language) ?? parts.language

  if (!language) {
    return null
  }

  const variant = resolveVariant({ ...parts, language })
  if (variant && supportedLanguageCodes.has(variant)) {
    return variant as LocaleCode
  }

  if (supportedLanguageCodes.has(language)) {
    return language as LocaleCode
  }

  const regionalVariant = supportedLanguageCodeList.find(code => code.startsWith(`${language}_`))
  return (regionalVariant ?? null) as LocaleCode | null
}

export const resolveLanguageCode = (languageCode?: string | null): LocaleCode => matchLanguageCode(languageCode) ?? DEFAULT_LANGUAGE

/**
 * Picks the first bundle that serves any of the user's languages, in their own order of
 * preference. A browser set to a language we do not ship still lands on the user's second
 * choice rather than dropping straight to English.
 */
export const resolveLanguagePreference = (languageCodes: readonly (string | null | undefined)[]): LocaleCode => {
  for (const languageCode of languageCodes) {
    const matched = matchLanguageCode(languageCode)
    if (matched) return matched
  }
  return DEFAULT_LANGUAGE
}

export const getSupportedLanguageCodes = () => supportedLanguageCodeList
