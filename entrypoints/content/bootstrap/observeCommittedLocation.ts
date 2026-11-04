import type { ContentScriptContext } from 'wxt/utils/content-script-context'

/** Observe URL changes after they commit; WXT's Navigation API event fires before commit. */
export const observeCommittedLocation = (ctx: Pick<ContentScriptContext, 'addEventListener'>, reconcile: () => void) => {
  if (typeof globalThis.navigation?.addEventListener === 'function') {
    ctx.addEventListener(globalThis.navigation, 'currententrychange', reconcile)
  } else {
    // WXT polls the committed location when the Navigation API is unavailable.
    ctx.addEventListener(window, 'wxt:locationchange', reconcile)
  }
}
