import { type RefObject, useEffect } from 'react'

/** Listen only while open, including the currently borrowed chat document. */
export const useOverlayMenuDismiss = (open: boolean, railRef: RefObject<HTMLDivElement | null>, dismiss: () => void) => {
  useEffect(() => {
    const rail = railRef.current
    if (!open || !rail) return
    const frame = rail.closest('[data-ylc-resizable]')
    const scope = frame ?? (rail.getRootNode() as Document | ShadowRoot)
    const ownerDocument = rail.ownerDocument
    let chatDocument: Document | null = null
    const onPointerDown = (event: PointerEvent) => {
      const path = event.composedPath()
      if (path.includes(rail)) return
      // Directly adjusting this frame keeps its placement menu attached.
      if (path.some(node => node instanceof Element && frame?.contains(node) && node.hasAttribute('data-ylc-resize-direction'))) return
      dismiss()
    }
    const bindChat = () => {
      let next: Document | null = null
      try {
        next = scope.querySelector<HTMLIFrameElement>('iframe[data-ylc-chat]')?.contentDocument ?? null
      } catch {
        // A native navigation may temporarily make the borrowed document inaccessible.
      }
      if (next === chatDocument) return
      chatDocument?.removeEventListener('pointerdown', onPointerDown, true)
      chatDocument = next
      chatDocument?.addEventListener('pointerdown', onPointerDown, true)
    }
    ownerDocument.addEventListener('pointerdown', onPointerDown, true)
    scope.addEventListener('load', bindChat, true)
    const observer = new MutationObserver(bindChat)
    observer.observe(scope, { childList: true, subtree: true })
    bindChat()
    return () => {
      ownerDocument.removeEventListener('pointerdown', onPointerDown, true)
      chatDocument?.removeEventListener('pointerdown', onPointerDown, true)
      scope.removeEventListener('load', bindChat, true)
      observer.disconnect()
    }
  }, [dismiss, open, railRef])
}
