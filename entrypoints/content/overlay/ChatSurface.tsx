import { type CSSProperties, type MouseEvent, type ReactNode, useRef } from 'react'
import { CHAT_PANEL_LAYER } from '@/shared/constants/zIndex'

type ChatSurfaceProps = {
  children: ReactNode
  innerStyle: CSSProperties
  isDragging: boolean
  onEnterChat: () => void
  onLeaveChat: () => void
}

const DRAG_SHIELD_STYLE: CSSProperties = {
  zIndex: CHAT_PANEL_LAYER.dragShield,
}

const isInsideVisibleBounds = (event: MouseEvent<HTMLElement>, rect: DOMRect) => {
  if (rect.bottom <= rect.top || rect.right <= rect.left) return false
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
}

export const ChatSurface = ({ children, innerStyle, isDragging, onEnterChat, onLeaveChat }: ChatSurfaceProps) => {
  const visibleBoundsRef = useRef<DOMRect | null>(null)

  const handlePointerOverVisibleChat = (event: MouseEvent<HTMLElement>, refreshBounds = false) => {
    const bounds = refreshBounds || !visibleBoundsRef.current ? event.currentTarget.getBoundingClientRect() : visibleBoundsRef.current
    visibleBoundsRef.current = bounds
    if (isInsideVisibleBounds(event, bounds)) {
      onEnterChat()
      return
    }
    onLeaveChat()
  }

  const handleMouseLeave = () => {
    visibleBoundsRef.current = null
    onLeaveChat()
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Hover controls chat visibility; interactive descendants keep their semantics.
    <div
      data-ylc-chat-inner
      className='relative h-full w-full pointer-events-auto'
      style={innerStyle}
      onMouseEnter={event => handlePointerOverVisibleChat(event, true)}
      onMouseMove={handlePointerOverVisibleChat}
      onMouseLeave={handleMouseLeave}
    >
      <div className='relative w-full h-full'>
        {isDragging ? (
          <div data-ylc-drag-shield className='absolute inset-0 cursor-grabbing bg-transparent' style={DRAG_SHIELD_STYLE} />
        ) : null}
        {children}
      </div>
    </div>
  )
}
