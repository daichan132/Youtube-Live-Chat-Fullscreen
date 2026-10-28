import { type RefObject, useEffect } from 'react'
import { isAccessibleNode } from '../chat/shared/isAccessibleNode'
import { observeOverlayChatDocument } from './observeOverlayChatDocument'

/** Escape follows keyboard focus into the currently borrowed chat document. */
export const useOverlayTooltipDismiss = (visible: boolean, railRef: RefObject<HTMLDivElement | null>, dismiss: () => void) => {
  useEffect(() => {
    const rail = railRef.current
    if (!visible || !rail) return
    const ownerDocument = rail.ownerDocument
    const scope = rail.closest('[data-ylc-resizable]') ?? (rail.getRootNode() as Document | ShadowRoot)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      dismiss()
    }
    ownerDocument.addEventListener('keydown', onKeyDown)
    const releaseChat = observeOverlayChatDocument(scope, (_frame, chatDocument) => {
      const onChatKeyDown = (event: KeyboardEvent) => {
        if (isAccessibleNode(chatDocument)) onKeyDown(event)
      }
      chatDocument.addEventListener('keydown', onChatKeyDown)
      return () => chatDocument.removeEventListener('keydown', onChatKeyDown)
    })
    return () => {
      ownerDocument.removeEventListener('keydown', onKeyDown)
      releaseChat()
    }
  }, [dismiss, railRef, visible])
}
