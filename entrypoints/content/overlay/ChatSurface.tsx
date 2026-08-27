import type { CSSProperties, MouseEvent, ReactNode } from 'react'
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

const isInsideVisibleBounds = (event: MouseEvent<HTMLElement>) => {
  const rect = event.currentTarget.getBoundingClientRect()
  if (rect.bottom <= rect.top || rect.right <= rect.left) return false
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
}

export const ChatSurface = ({ children, innerStyle, isDragging, onEnterChat, onLeaveChat }: ChatSurfaceProps) => {
  const handlePointerOverVisibleChat = (event: MouseEvent<HTMLElement>) => {
    if (isInsideVisibleBounds(event)) {
      onEnterChat()
      return
    }
    onLeaveChat()
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Hover controls chat visibility; interactive descendants keep their semantics.
    <div
      data-ylc-chat-inner
      className='relative h-full w-full pointer-events-auto'
      style={innerStyle}
      onMouseEnter={handlePointerOverVisibleChat}
      onMouseMove={handlePointerOverVisibleChat}
      onMouseLeave={onLeaveChat}
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
