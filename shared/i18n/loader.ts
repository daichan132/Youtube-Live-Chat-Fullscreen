import { browser } from 'wxt/browser'
import type { LocaleCode, LocaleMessages, TranslationKey } from './generated/translationTypes'

const cache = new Map<LocaleCode, Promise<LocaleMessages>>()
let keysCache: Promise<readonly TranslationKey[]> | undefined

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Locale asset not found: ${url}`)
  return response.json()
}

const loadTranslationKeys = () => {
  keysCache ??= fetchJson(browser.runtime.getURL('/locales/_keys.json')).then(value => {
    if (!Array.isArray(value) || value.some(key => typeof key !== 'string')) {
      throw new Error('Invalid locale key asset')
    }
    return value as TranslationKey[]
  })
  return keysCache
}

export const loadLocaleMessages = (locale: LocaleCode): Promise<LocaleMessages> => {
  const cached = cache.get(locale)
  if (cached) return cached
  const loading = Promise.all([loadTranslationKeys(), fetchJson(browser.runtime.getURL(`/locales/${locale}.json`))])
    .then(([keys, value]) => {
      if (!Array.isArray(value) || value.length !== keys.length || value.some(message => typeof message !== 'string')) {
        throw new Error(`Invalid locale message asset: ${locale}`)
      }
      return Object.fromEntries(keys.map((key, index) => [key, value[index]])) as LocaleMessages
    })
    .catch(error => {
      if (locale === 'en') throw error
      return loadLocaleMessages('en')
    })
  cache.set(locale, loading)
  return loading
}

export const clearLocaleCache = () => {
  cache.clear()
  keysCache = undefined
}
