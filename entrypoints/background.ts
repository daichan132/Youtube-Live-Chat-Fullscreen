import { browser } from 'wxt/browser'
import { serveExtensionAsset } from '@/shared/runtime/serveExtensionAsset'

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(serveExtensionAsset)
})
