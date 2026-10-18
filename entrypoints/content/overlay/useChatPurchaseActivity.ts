import { useLayoutEffect } from 'react'
import { observeChatPurchaseUI } from '../runtime/resources/ChatChromeLease'

/** Bind to the current iframe document, including native reloads and replacement. */
export const useChatPurchaseActivity = (carrier: HTMLElement | null, onChange: (active: boolean) => void) => {
  useLayoutEffect(() => {
    if (!carrier) return
    let iframe: HTMLIFrameElement | null = null
    let body: HTMLElement | null = null
    let active = false
    let release: (() => void) | undefined
    const update = (next: boolean) => {
      active = next
      onChange(next)
    }
    const bind = () => {
      const nextIframe = carrier.querySelector('iframe')
      let nextBody: HTMLElement | null = null
      try {
        nextBody = nextIframe?.contentDocument?.body ?? null
      } catch {
        // A native payment navigation may be cross-origin; do not inspect it.
      }
      if (nextIframe === iframe && nextBody === body) return
      release?.()
      release = undefined
      const sameIframe = nextIframe === iframe
      iframe = nextIframe
      body = nextBody
      // Keep an already-open flow visible through an inaccessible navigation
      // in the same borrowed frame. Its old document is no longer observed.
      if (!body && sameIframe && iframe && active) return
      update(false)
      release = body ? observeChatPurchaseUI(body, update) : undefined
    }
    const observer = new MutationObserver(bind)
    observer.observe(carrier, { childList: true })
    carrier.addEventListener('load', bind, true)
    bind()
    return () => {
      observer.disconnect()
      carrier.removeEventListener('load', bind, true)
      release?.()
      update(false)
    }
  }, [carrier, onChange])
}
