import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatSurface } from './ChatSurface'

describe('ChatSurface', () => {
  it('reports whether the pointer is inside the visible chat bounds', () => {
    let inside = false
    const { container } = render(
      <ChatSurface
        innerStyle={{}}
        isDragging={false}
        onEnterChat={() => {
          inside = true
        }}
        onLeaveChat={() => {
          inside = false
        }}
      >
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
    expect(inside).toBe(true)
    fireEvent.mouseMove(surface, { clientX: 150, clientY: 50 })
    expect(inside).toBe(false)
  })

  it('uses the new visible bounds after leaving and re-entering a moved surface', () => {
    let inside = false
    const { container } = render(
      <ChatSurface
        innerStyle={{}}
        isDragging={false}
        onEnterChat={() => {
          inside = true
        }}
        onLeaveChat={() => {
          inside = false
        }}
      >
        chat
      </ChatSurface>,
    )
    const surface = container.querySelector<HTMLElement>('[data-ylc-chat-inner]') as HTMLElement
    let left = 10
    vi.spyOn(surface, 'getBoundingClientRect').mockImplementation(() => new DOMRect(left, 10, 100, 100))

    fireEvent.mouseEnter(surface, { clientX: 50, clientY: 50 })
    expect(inside).toBe(true)
    fireEvent.mouseLeave(surface)
    expect(inside).toBe(false)
    left = 200
    fireEvent.mouseEnter(surface, { clientX: 250, clientY: 50 })

    expect(inside).toBe(true)
  })
})
