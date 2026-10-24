import { type RefObject, useEffect } from 'react'

/** Escape follows keyboard focus into the currently borrowed chat document. */
export const useOverlayTooltipDismiss = (visible: boolean, railRef: RefObject<HTMLDivElement | null>, dismiss: () => void) => {
  useEffect(() => {
    const rail = railRef.current
    if (!visible || !rail) return
    const ownerDocument = rail.ownerDocument
    const scope = rail.closest('[data-ylc-resizable]') ?? (rail.getRootNode() as Document | ShadowRoot)
    let chatDocument: Document | null = null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      dismiss()
    }
    const bindChat = () => {
      let next: Document | null = null
      try {
        next = scope.querySelector<HTMLIFrameElement>('iframe[data-ylc-chat]')?.contentDocument ?? null
      } catch {
        // Native navigation can temporarily make the borrowed document inaccessible.
      }
      if (next === chatDocument) return
      chatDocument?.removeEventListener('keydown', onKeyDown)
      chatDocument = next
      chatDocument?.addEventListener('keydown', onKeyDown)
    }
    ownerDocument.addEventListener('keydown', onKeyDown)
    scope.addEventListener('load', bindChat, true)
    const observer = new MutationObserver(bindChat)
    observer.observe(scope, { childList: true, subtree: true })
    bindChat()
    return () => {
      ownerDocument.removeEventListener('keydown', onKeyDown)
      chatDocument?.removeEventListener('keydown', onKeyDown)
      scope.removeEventListener('load', bindChat, true)
      observer.disconnect()
    }
  }, [dismiss, railRef, visible])
}
