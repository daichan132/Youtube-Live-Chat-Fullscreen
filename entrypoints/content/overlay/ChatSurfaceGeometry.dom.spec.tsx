import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatSurface } from './ChatSurface'

const rect = (left: number): DOMRect => ({
  top: 0,
  right: left + 100,
  bottom: 100,
  left,
  width: 100,
  height: 100,
  x: left,
  y: 0,
  toJSON: () => ({}),
})

describe('ChatSurface geometry-aware hover bounds', () => {
  it('invalidates cached bounds when rendered geometry changes', () => {
    const onEnterChat = vi.fn()
    const onLeaveChat = vi.fn()
    const view = render(
      <ChatSurface innerStyle={{}} boundsRevision='0:0:100:100' isDragging={false} onEnterChat={onEnterChat} onLeaveChat={onLeaveChat}>
        chat
      </ChatSurface>,
    )
    const surface = view.container.querySelector<HTMLElement>('[data-ylc-chat-inner]')
    if (!surface) throw new Error('Missing chat surface')
    const readBounds = vi.spyOn(surface, 'getBoundingClientRect').mockReturnValueOnce(rect(0)).mockReturnValueOnce(rect(200))

    fireEvent.mouseMove(surface, { clientX: 50, clientY: 50 })
    expect(onEnterChat).toHaveBeenCalledOnce()

    view.rerender(
      <ChatSurface innerStyle={{}} boundsRevision='200:0:100:100' isDragging={false} onEnterChat={onEnterChat} onLeaveChat={onLeaveChat}>
        chat
      </ChatSurface>,
    )
    fireEvent.mouseMove(surface, { clientX: 50, clientY: 50 })

    expect(readBounds).toHaveBeenCalledTimes(2)
    expect(onLeaveChat).toHaveBeenCalledOnce()
  })
})
