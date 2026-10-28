import { type RefObject, useEffect } from 'react'
import { isAccessibleNode } from '../chat/shared/isAccessibleNode'
import { observeOverlayChatDocument } from './observeOverlayChatDocument'

/** Listen only while open, including the currently borrowed chat document. */
export const useOverlayMenuDismiss = (open: boolean, railRef: RefObject<HTMLDivElement | null>, dismiss: () => void) => {
  useEffect(() => {
    const rail = railRef.current
    if (!open || !rail) return
    const frame = rail.closest('[data-ylc-resizable]')
    const scope = frame ?? (rail.getRootNode() as Document | ShadowRoot)
    const ownerDocument = rail.ownerDocument
    const onPointerDown = (event: PointerEvent) => {
      const path = event.composedPath()
      if (path.includes(rail)) return
      // Directly adjusting this frame keeps its placement menu attached.
      if (path.some(node => node instanceof Element && frame?.contains(node) && node.hasAttribute('data-ylc-resize-direction'))) return
      dismiss()
    }
    ownerDocument.addEventListener('pointerdown', onPointerDown, true)
    const releaseChat = observeOverlayChatDocument(scope, (_frame, chatDocument) => {
      const onChatPointerDown = (event: PointerEvent) => {
        if (isAccessibleNode(chatDocument)) onPointerDown(event)
      }
      chatDocument.addEventListener('pointerdown', onChatPointerDown, true)
      return () => chatDocument.removeEventListener('pointerdown', onChatPointerDown, true)
    })
    return () => {
      ownerDocument.removeEventListener('pointerdown', onPointerDown, true)
      releaseChat()
    }
  }, [dismiss, open, railRef])
}
