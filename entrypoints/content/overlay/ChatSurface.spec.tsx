import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatSurface } from './ChatSurface'

describe('ChatSurface', () => {
  it('keeps hover state scoped to cached visible chat bounds', () => {
    const onEnterChat = vi.fn()
    const onLeaveChat = vi.fn()
    const { container } = render(
      <ChatSurface innerStyle={{}} isDragging={false} onEnterChat={onEnterChat} onLeaveChat={onLeaveChat}>
        chat
      </ChatSurface>,
    )
    const surface = container.querySelector<HTMLElement>('[data-ylc-chat-inner]') as HTMLElement
    const readBounds = vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({
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
    expect(readBounds).toHaveBeenCalledOnce()
  })

  it('refreshes cached bounds after the pointer leaves and re-enters', () => {
    const { container } = render(
      <ChatSurface innerStyle={{}} isDragging={false} onEnterChat={() => {}} onLeaveChat={() => {}}>
        chat
      </ChatSurface>,
    )
    const surface = container.querySelector<HTMLElement>('[data-ylc-chat-inner]') as HTMLElement
    const readBounds = vi.spyOn(surface, 'getBoundingClientRect')

    fireEvent.mouseEnter(surface, { clientX: 0, clientY: 0 })
    fireEvent.mouseLeave(surface)
    fireEvent.mouseEnter(surface, { clientX: 0, clientY: 0 })

    expect(readBounds).toHaveBeenCalledTimes(2)
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

  it('sizes the pointer shield to cover its positioned parent', () => {
    const { container } = render(
      <ChatSurface innerStyle={{}} isDragging onEnterChat={() => {}} onLeaveChat={() => {}}>
        chat
      </ChatSurface>,
    )
    const shield = container.querySelector<HTMLElement>('[data-ylc-drag-shield]') as HTMLElement
    const classes = [...shield.classList]

    // A shield that carries no size utility resolves to 0x0 and silently stops
    // blocking pointer events over the chat iframe mid-drag.
    expect(classes).toContain('absolute')
    expect(classes).toContain('inset-0')
    // Percentage suffixes such as `w-100%` are not Tailwind utilities and emit no rule.
    expect(classes.filter(name => /^[wh]-\d+%$/.test(name))).toEqual([])
  })
})
