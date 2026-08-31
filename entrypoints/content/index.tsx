import { CONTENT_SCRIPT_MATCHES } from '../../config/packagePolicy'
import './content.css'
import { ContentBootstrap } from './bootstrap/ContentBootstrap'
import { createContentSession } from './bootstrap/createContentSession'

export default defineContentScript({
  matches: [...CONTENT_SCRIPT_MATCHES],
  cssInjectionMode: 'ui',

  main(ctx) {
    const bootstrap = new ContentBootstrap(() => createContentSession(ctx), {
      onPermanentFailure: failure => console.warn('[YLC] Content session activation failed', failure),
    })
    ctx.addEventListener(window, 'wxt:locationchange', event => {
      void bootstrap.reconcileLocation(event.newUrl.href)
    })
    ctx.addEventListener(document, 'yt-navigate-finish', () => {
      void bootstrap.reconcileLocation(undefined, { navigationCompleted: true })
    })
    ctx.onInvalidated(bootstrap.dispose)
    bootstrap.start()
  },
})
