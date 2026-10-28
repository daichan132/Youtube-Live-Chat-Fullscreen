import { CONTENT_SCRIPT_MATCHES } from '../../config/packagePolicy'
import './content.css'
import { ContentBootstrap } from './bootstrap/ContentBootstrap'
import { registerContentStatusMessaging } from './bootstrap/contentStatusMessaging'
import { createContentSession } from './bootstrap/createContentSession'
import { observeCommittedLocation } from './bootstrap/observeCommittedLocation'

export default defineContentScript({
  matches: [...CONTENT_SCRIPT_MATCHES],
  cssInjectionMode: 'manual',

  main(ctx) {
    const bootstrap = new ContentBootstrap(() => createContentSession(ctx), {
      onPermanentFailure: failure => console.warn('[YLC] Content session activation failed', failure),
    })
    observeCommittedLocation(ctx, () => void bootstrap.reconcileLocation())
    ctx.addEventListener(document, 'yt-navigate-finish', () => {
      void bootstrap.reconcileLocation(undefined, { navigationCompleted: true })
    })
    ctx.onInvalidated(registerContentStatusMessaging(bootstrap))
    ctx.onInvalidated(bootstrap.dispose)
    bootstrap.start()
  },
})
