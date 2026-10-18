import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatSurface } from './ChatSurface'

describe('ChatSurface', () => {
  it('reports whether the pointer is inside the visible chat bounds', () => {
    const onEnterChat = vi.fn()
    const onLeaveChat = vi.fn()
    const { container } = render(
      <ChatSurface innerStyle={{}} isDragging={false} onEnterChat={onEnterChat} onLeaveChat={onLeaveChat}>
        chat
      </ChatSurface>,
    )
    const surface = container.querySelector<HTMLElement>('[data-ylc-chat-inner]') as HTMLElement
    vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({
      top: 10,
      right: 110,
      bottom: 110,
      left: 10,
      width: 100,
      height: 100,
      x: 10,
      y: 10,
      toJSON: () => ({}),
    })

    fireEvent.mouseMove(surface, { clientX: 50, clientY: 50 })
    fireEvent.mouseMove(surface, { clientX: 150, clientY: 50 })

    expect(onEnterChat).toHaveBeenCalledOnce()
    expect(onLeaveChat).toHaveBeenCalledOnce()
  })

  it('uses the new visible bounds after leaving and re-entering a moved surface', () => {
    const onEnterChat = vi.fn()
    const onLeaveChat = vi.fn()
    const { container } = render(
      <ChatSurface innerStyle={{}} isDragging={false} onEnterChat={onEnterChat} onLeaveChat={onLeaveChat}>
        chat
      </ChatSurface>,
    )
    const surface = container.querySelector<HTMLElement>('[data-ylc-chat-inner]') as HTMLElement
    let left = 10
    vi.spyOn(surface, 'getBoundingClientRect').mockImplementation(() => new DOMRect(left, 10, 100, 100))

    fireEvent.mouseEnter(surface, { clientX: 50, clientY: 50 })
    expect(onEnterChat).toHaveBeenCalledOnce()
    fireEvent.mouseLeave(surface)
    onEnterChat.mockClear()
    onLeaveChat.mockClear()
    left = 200
    fireEvent.mouseEnter(surface, { clientX: 250, clientY: 50 })

    expect(onEnterChat).toHaveBeenCalledOnce()
    expect(onLeaveChat).not.toHaveBeenCalled()
  })

  it('adds a pointer shield only while an active pointer gesture is reported', () => {
    const { container, rerender } = render(
      <ChatSurface innerStyle={{}} isDragging={false} onEnterChat={() => {}} onLeaveChat={() => {}}>
        chat
      </ChatSurface>,
    )

    expect(container.querySelector('[data-ylc-drag-shield]')).toBeNull()

    rerender(
      <ChatSurface innerStyle={{}} isDragging onEnterChat={() => {}} onLeaveChat={() => {}}>
        chat
      </ChatSurface>,
    )

    expect(container.querySelector('[data-ylc-drag-shield]')).not.toBeNull()
  })
})
