import { browser } from 'wxt/browser'
import type { LocaleCode, LocaleMessages } from './generated/translationTypes'

const cache = new Map<LocaleCode, Promise<LocaleMessages>>()

export const loadLocaleMessages = (locale: LocaleCode): Promise<LocaleMessages> => {
  const cached = cache.get(locale)
  if (cached) return cached
  const loading = fetch(browser.runtime.getURL(`/locales/${locale}.json`)).then(async response => {
    if (!response.ok) throw new Error(`Locale not found: ${locale}`)
    return (await response.json()) as LocaleMessages
  })
  cache.set(locale, loading)
  return loading
}

export const clearLocaleCache = () => cache.clear()
