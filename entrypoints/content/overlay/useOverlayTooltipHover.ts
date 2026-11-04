import { type RefObject, useCallback, useEffect } from 'react'
import { isAccessibleNode } from '../chat/shared/isAccessibleNode'
import { observeOverlayChatDocument } from './observeOverlayChatDocument'

type Point = { x: number; y: number }

/** Track a click-through help region without adding a pointer-intercepting layer. */
export const useOverlayTooltipHover = (
  active: boolean,
  railRef: RefObject<HTMLDivElement | null>,
  tooltipRef: RefObject<HTMLDivElement | null>,
  controlSelector: string | null,
  leave: () => void,
) => {
  const containsPoint = useCallback(
    ({ x, y }: Point) => {
      if (!active || !controlSelector) return false
      const button = railRef.current?.querySelector(controlSelector)
      const tooltip = tooltipRef.current
      if (!button || !tooltip) return false
      const trigger = button.getBoundingClientRect()
      const help = tooltip.getBoundingClientRect()
      if (trigger.width <= 0 || trigger.height <= 0 || help.width <= 0 || help.height <= 0) return false
      // The union includes the short gap, allowing magnified or imprecise
      // pointers to cross from the trigger into the additional content.
      return (
        x >= Math.min(trigger.left, help.left) - 2 &&
        x <= Math.max(trigger.right, help.right) + 2 &&
        y >= Math.min(trigger.top, help.top) - 2 &&
        y <= Math.max(trigger.bottom, help.bottom) + 2
      )
    },
    [active, controlSelector, railRef, tooltipRef],
  )

  useEffect(() => {
    const rail = railRef.current
    if (!active || !rail) return
    const ownerDocument = rail.ownerDocument
    const scope = rail.closest('[data-ylc-resizable]') ?? (rail.getRootNode() as Document | ShadowRoot)
    const onPointerMove = (event: PointerEvent) => {
      // Individual buttons own switching hover help. A late event for the old
      // help must not clear a different button's new hover state.
      if (event.composedPath().some(node => node instanceof Element && node.matches('button') && rail.contains(node))) return
      if (!containsPoint({ x: event.clientX, y: event.clientY })) leave()
    }
    ownerDocument.addEventListener('pointermove', onPointerMove, { passive: true })
    const releaseChat = observeOverlayChatDocument(scope, (frame, chatDocument) => {
      const onChatPointerMove = (event: PointerEvent) => {
        if (!isAccessibleNode(chatDocument) || !chatDocument.defaultView) return
        const bounds = frame.getBoundingClientRect()
        const viewport = chatDocument.defaultView
        const point = {
          x: bounds.left + (event.clientX * bounds.width) / (viewport.innerWidth || bounds.width || 1),
          y: bounds.top + (event.clientY * bounds.height) / (viewport.innerHeight || bounds.height || 1),
        }
        if (!containsPoint(point)) leave()
      }
      chatDocument.addEventListener('pointermove', onChatPointerMove, { passive: true })
      return () => chatDocument.removeEventListener('pointermove', onChatPointerMove)
    })
    return () => {
      ownerDocument.removeEventListener('pointermove', onPointerMove)
      releaseChat()
    }
  }, [active, containsPoint, leave, railRef])

  return containsPoint
}
