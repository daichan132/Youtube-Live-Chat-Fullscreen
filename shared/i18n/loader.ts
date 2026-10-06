import { browser } from 'wxt/browser'
import type { LocaleCode, LocaleMessages, TranslationKey } from './generated/translationTypes'

type LocaleAssetCache = {
  messages: Map<LocaleCode, Promise<LocaleMessages>>
  keys?: Promise<readonly TranslationKey[]>
  defaults?: Promise<readonly string[]>
}
let cache: LocaleAssetCache = { messages: new Map() }

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Locale asset not found: ${url}`)
  return response.json()
}

const loadTranslationKeys = (assets: LocaleAssetCache) => {
  assets.keys ??= fetchJson(browser.runtime.getURL('/locales/_keys.json')).then(value => {
    if (!Array.isArray(value)) throw new Error('Invalid locale key asset')
    for (const key of value) if (typeof key !== 'string') throw new Error('Invalid locale key asset')
    return value as TranslationKey[]
  })
  return assets.keys
}

const loadTranslationDefaults = (assets: LocaleAssetCache, keyCount: number) => {
  assets.defaults ??= fetchJson(browser.runtime.getURL('/locales/_defaults.json')).then(value => {
    if (!Array.isArray(value) || value.length !== keyCount) throw new Error('Invalid locale default asset')
    for (const message of value) if (typeof message !== 'string') throw new Error('Invalid locale default asset')
    return value as string[]
  })
  return assets.defaults
}

const loadCachedLocaleMessages = (locale: LocaleCode, assets: LocaleAssetCache): Promise<LocaleMessages> => {
  const cached = assets.messages.get(locale)
  if (cached) return cached
  const loading = Promise.all([loadTranslationKeys(assets), fetchJson(browser.runtime.getURL(`/locales/${locale}.json`))])
    .then(async ([keys, value]) => {
      if (!Array.isArray(value) || value.length !== keys.length) throw new Error(`Invalid locale message asset: ${locale}`)
      let needsDefaults = false
      for (const message of value) {
        if (message === null) needsDefaults = true
        else if (typeof message !== 'string') throw new Error(`Invalid locale message asset: ${locale}`)
      }
      const defaults = needsDefaults ? await loadTranslationDefaults(assets, keys.length) : []
      return Object.fromEntries(keys.map((key, index) => [key, value[index] === null ? defaults[index] : value[index]])) as LocaleMessages
    })
    .catch(error => {
      if (locale === 'en') throw error
      return loadCachedLocaleMessages('en', assets)
    })
  assets.messages.set(locale, loading)
  return loading
}

export const loadLocaleMessages = (locale: LocaleCode): Promise<LocaleMessages> => loadCachedLocaleMessages(locale, cache)

export const clearLocaleCache = () => {
  // Pending loads keep their own assets; they must not repopulate the new cache.
  cache = { messages: new Map() }
}
