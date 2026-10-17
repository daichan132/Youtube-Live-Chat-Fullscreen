import { browser, type PublicPath } from 'wxt/browser'
import { type ExtensionAssetResponse, isExtensionAssetRequest } from './extensionAssets'

// Extension-owned files are fetched in the extension origin, never through the
// host page's Service Worker or Connection Allowlist.
export const serveExtensionAsset = (message: unknown, sender: { id?: string }): Promise<ExtensionAssetResponse> | undefined => {
  if (sender.id !== browser.runtime.id || !isExtensionAssetRequest(message)) return undefined
  const isStyle = message.asset === 'content-style'
  const path = isStyle ? 'content-scripts/content.css' : `locales/${message.asset}.json`
  return fetch(browser.runtime.getURL(path as PublicPath))
    .then(async response => {
      if (!response.ok) return { ok: false } as const
      return { ok: true, value: await (isStyle ? response.text() : response.json()) } as const
    })
    .catch(() => ({ ok: false }))
}
