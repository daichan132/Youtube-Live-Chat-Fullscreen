import { useLayoutEffect } from 'react'
import { observeChatPurchaseUI } from '../chat/shared/chatPurchaseActivity'
import { isAccessibleNode } from '../chat/shared/isAccessibleNode'

/** Bind to the current iframe document, including native reloads and replacement. */
export const useChatPurchaseActivity = (carrier: HTMLElement | null, onChange: (active: boolean) => void) => {
  useLayoutEffect(() => {
    if (!carrier) return
    let iframe: HTMLIFrameElement | null = null
    let chatDocument: Document | null = null
    let body: HTMLElement | null = null
    let active = false
    let release: (() => void) | undefined
    const update = (next: boolean) => {
      active = next
      onChange(next)
    }
    const bind = () => {
      const nextIframe = carrier.querySelector('iframe')
      let nextDocument: Document | null = null
      try {
        nextDocument = nextIframe?.contentDocument ?? null
      } catch {
        // A native payment navigation may be cross-origin; do not inspect it.
      }
      if (!isAccessibleNode(nextDocument)) nextDocument = null
      const nextBody = nextDocument?.body ?? null
      if (nextIframe === iframe && nextDocument === chatDocument && nextBody === body) return
      release?.()
      release = undefined
      const sameIframe = nextIframe === iframe
      const sameDocument = nextDocument === chatDocument
      const continuePurchase = sameIframe && sameDocument && active
      iframe = nextIframe
      chatDocument = nextDocument
      body = nextBody
      let stopPurchaseObserver: (() => void) | undefined
      let documentObserver: MutationObserver | undefined
      if (nextDocument?.documentElement) {
        const observedDocument = nextDocument
        documentObserver = new MutationObserver(() => {
          if (isAccessibleNode(observedDocument) && observedDocument === chatDocument && observedDocument.body !== body) bind()
        })
        documentObserver.observe(observedDocument.documentElement, { childList: true })
      }
      release = () => {
        documentObserver?.disconnect()
        stopPurchaseObserver?.()
      }
      // An inaccessible navigation or temporarily absent body can retain this
      // flow. A different accessible document starts with no purchase history.
      if (!body && sameIframe && iframe && active && (!nextDocument || sameDocument)) return
      if (body) stopPurchaseObserver = observeChatPurchaseUI(body, update, continuePurchase)
      else update(false)
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
