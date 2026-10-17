import { browser } from 'wxt/browser'
import { localeCodes } from '@/shared/i18n/generated/localeMetadata'
import type { LocaleCode } from '@/shared/i18n/generated/translationTypes'

export type ExtensionAsset = LocaleCode | '_keys' | 'content-style'
export type ExtensionAssetRequest = { type: 'ylc:asset'; asset: ExtensionAsset }
export type ExtensionAssetResponse = { ok: true; value: unknown } | { ok: false }

export const isExtensionAssetRequest = (input: unknown): input is ExtensionAssetRequest => {
  if (!input || typeof input !== 'object') return false
  const value = input as Record<string, unknown>
  return (
    Object.keys(value).length === 2 &&
    value.type === 'ylc:asset' &&
    typeof value.asset === 'string' &&
    (value.asset === '_keys' || value.asset === 'content-style' || localeCodes.includes(value.asset as LocaleCode))
  )
}

export const loadExtensionAsset = async (asset: ExtensionAsset): Promise<unknown> => {
  const response: ExtensionAssetResponse | undefined = await browser.runtime.sendMessage({ type: 'ylc:asset', asset })
  if (response?.ok !== true) throw new Error('Extension asset unavailable')
  return response.value
}

export const loadContentStyles = async (): Promise<string> => {
  const value = await loadExtensionAsset('content-style')
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid content stylesheet')
  return value
}
