import { useLayoutEffect } from 'react'
import { isTextInputType } from '@/shared/utils/isTextInputType'
import { isAccessibleNode } from '../chat/shared/isAccessibleNode'

const focusedEditable = (document: Document) => {
  const active = document.activeElement
  if (!active || active.closest('[inert], [aria-disabled="true"]')) return null
  if (active.localName === 'textarea' || active.localName === 'input') {
    const input = active as HTMLInputElement | HTMLTextAreaElement
    if (
      input.matches(':disabled') ||
      input.readOnly ||
      (input.localName === 'input' && !isTextInputType((input as HTMLInputElement).type))
    ) {
      return null
    }
    return input
  }
  const editable = active.closest<HTMLElement>('[contenteditable]')
  return editable && editable.getAttribute('contenteditable')?.toLowerCase() !== 'false' ? editable : null
}

/** Observe only the currently attached chat document; never inspect its draft. */
export const useChatInputFocus = (carrier: HTMLElement | null, onChange: (focused: boolean) => void) => {
  useLayoutEffect(() => {
    if (!carrier) return
    let iframe: HTMLIFrameElement | null = null
    let document: Document | null = null
    let body: HTMLElement | null = null
    let focused = false
    let release: (() => void) | undefined
    const update = (next: boolean) => {
      if (next === focused) return
      focused = next
      onChange(next)
    }
    const bind = () => {
      const nextIframe = carrier.querySelector('iframe')
      let nextDocument: Document | null = null
      try {
        nextDocument = nextIframe?.contentDocument ?? null
      } catch {
        // Native navigation can make the borrowed document inaccessible.
      }
      if (!isAccessibleNode(nextDocument)) nextDocument = null
      const nextBody = nextDocument?.body ?? null
      if (nextIframe === iframe && nextDocument === document && nextBody === body) return
      release?.()
      release = undefined
      iframe = nextIframe
      document = nextDocument
      body = nextBody
      update(false)
      if (!iframe || !document || !body) return

      const currentIframe = iframe
      const currentDocument = document
      const currentBody = body
      const chatWindow = document.defaultView
      let pendingFrame: number | null = null
      let editable: Element | null = null
      let disposed = false
      const stillOwned = () => !disposed && currentIframe === iframe && currentDocument === document && carrier.contains(currentIframe)
      const sync = () => {
        if (!stillOwned()) return
        if (!isAccessibleNode(currentDocument)) {
          update(false)
          return
        }
        editable = focusedEditable(currentDocument)
        update(currentDocument.hasFocus() && Boolean(editable))
      }
      const settle = () => {
        sync()
        if (pendingFrame !== null) return
        pendingFrame = requestAnimationFrame(() => {
          pendingFrame = null
          sync()
        })
      }
      currentDocument.addEventListener('focusin', settle)
      currentDocument.addEventListener('focusout', settle)
      chatWindow?.addEventListener('focus', settle)
      chatWindow?.addEventListener('blur', settle)
      window.addEventListener('focus', settle)
      window.addEventListener('blur', settle)

      // Removal of a focused node need not dispatch focusout. Ignore unrelated
      // chat mutations, and rebind if YouTube replaces the document's body.
      const documentObserver = new MutationObserver(records => {
        if (!isAccessibleNode(currentDocument)) {
          if (stillOwned()) update(false)
          return
        }
        if (currentDocument.body !== currentBody) {
          bind()
          return
        }
        const active = currentDocument.activeElement
        if (
          records.some(record =>
            record.type === 'attributes'
              ? active && (record.target === active || (record.target as Element).contains(active))
              : editable && [...record.removedNodes].some(node => node === editable || node.contains(editable)),
          )
        )
          settle()
      })
      documentObserver.observe(currentDocument.documentElement, { childList: true })
      documentObserver.observe(currentBody, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['contenteditable', 'disabled', 'readonly', 'aria-disabled', 'inert', 'type'],
      })
      release = () => {
        disposed = true
        if (pendingFrame !== null) cancelAnimationFrame(pendingFrame)
        documentObserver.disconnect()
        if (isAccessibleNode(currentDocument)) {
          currentDocument.removeEventListener('focusin', settle)
          currentDocument.removeEventListener('focusout', settle)
          chatWindow?.removeEventListener('focus', settle)
          chatWindow?.removeEventListener('blur', settle)
        }
        window.removeEventListener('focus', settle)
        window.removeEventListener('blur', settle)
      }
      sync()
    }
    const observer = new MutationObserver(bind)
    observer.observe(carrier, { childList: true, subtree: true })
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
