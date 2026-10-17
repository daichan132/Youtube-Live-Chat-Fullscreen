import { loadExtensionAsset } from '@/shared/runtime/extensionAssets'
import type { LocaleCode, LocaleMessages, TranslationKey } from './generated/translationTypes'

const cache = new Map<LocaleCode, Promise<LocaleMessages>>()
let keysCache: Promise<readonly TranslationKey[]> | undefined

const loadTranslationKeys = () => {
  if (keysCache) return keysCache
  const loading = loadExtensionAsset('_keys')
    .then(value => {
      if (!Array.isArray(value) || value.some(key => typeof key !== 'string')) {
        throw new Error('Invalid locale key asset')
      }
      return value as TranslationKey[]
    })
    .catch(error => {
      if (keysCache === loading) keysCache = undefined
      throw error
    })
  keysCache = loading
  return loading
}

export const loadLocaleMessages = (locale: LocaleCode): Promise<LocaleMessages> => {
  const cached = cache.get(locale)
  if (cached) return cached
  const loading = Promise.all([loadTranslationKeys(), loadExtensionAsset(locale)])
    .then(([keys, value]) => {
      if (!Array.isArray(value) || value.length !== keys.length || value.some(message => typeof message !== 'string')) {
        throw new Error(`Invalid locale message asset: ${locale}`)
      }
      return Object.fromEntries(keys.map((key, index) => [key, value[index]])) as LocaleMessages
    })
    .catch(error => {
      if (cache.get(locale) === loading) cache.delete(locale)
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
