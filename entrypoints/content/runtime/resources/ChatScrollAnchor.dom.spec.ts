import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { preserveChatScroll } from './ChatScrollAnchor'

const fixture = (following = false) => {
  document.body.innerHTML =
    '<yt-live-chat-item-list-renderer><div id="item-scroller"><div id="items"><div id="anchor"></div></div></div></yt-live-chat-item-list-renderer><button id="jump"></button>'
  const scroller = document.getElementById('item-scroller') as HTMLElement
  const anchor = document.getElementById('anchor') as HTMLElement
  const layout = { top: 10, height: 360, scrollHeight: 1000, contentY: 420 }
  Object.defineProperty(scroller, 'clientHeight', { get: () => layout.height })
  Object.defineProperty(scroller, 'scrollHeight', { get: () => layout.scrollHeight })
  scroller.scrollTop = following ? 640 : 250
  scroller.style.setProperty('scroll-behavior', 'smooth', 'important')
  scroller.style.setProperty('overflow-anchor', 'auto')
  vi.spyOn(scroller, 'getBoundingClientRect').mockImplementation(
    () => ({ left: 0, top: layout.top, width: 400, height: layout.height }) as DOMRect,
  )
  vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
    () => ({ top: layout.top + layout.contentY - scroller.scrollTop }) as DOMRect,
  )
  const hitTest = vi.fn(() => anchor)
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: hitTest })
  return { scroller, anchor, layout, hitTest }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(document, 'elementFromPoint')
  document.body.replaceChildren()
})

describe('transition-scoped chat scroll anchoring', () => {
  it('preserves the reading row through viewport movement and changes above that row', () => {
    const { scroller, anchor, layout } = fixture()
    const y = anchor.getBoundingClientRect().top
    const lease = preserveChatScroll(document.body, 310)
    layout.top += 44
    layout.height -= 96
    lease?.restore()
    expect(scroller.scrollTop).toBe(294)
    expect(anchor.getBoundingClientRect().top).toBe(y)
    layout.contentY += 24
    lease?.restore()
    expect(anchor.getBoundingClientRect().top).toBe(y)
    lease?.stop()
  })

  it('keeps a bottom follower at the latest messages as the viewport shrinks and messages arrive', () => {
    const { scroller, layout, hitTest } = fixture(true)
    const lease = preserveChatScroll(document.body, 310)
    expect(hitTest).not.toHaveBeenCalled()
    layout.height = 280
    lease?.restore()
    expect(scroller.scrollTop).toBe(720)
    layout.scrollHeight += 24
    lease?.restore()
    expect(scroller.scrollTop).toBe(744)
    lease?.stop()
  })

  it.each(['wheel', 'touchstart', 'pointerdown', 'keyboard', 'jump'])('yields to %s input without replaying or preventing it', type => {
    const { scroller, layout } = fixture()
    const lease = preserveChatScroll(document.body, 310)
    const event =
      type === 'keyboard'
        ? new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true })
        : new Event(type === 'jump' ? 'pointerdown' : type, { bubbles: true, cancelable: true })
    const target = type === 'jump' ? document.getElementById('jump') : scroller
    target?.dispatchEvent(event)
    scroller.scrollTop = 123
    layout.top = 54
    lease?.restore()
    expect(scroller.scrollTop).toBe(123)
    expect(event.defaultPrevented).toBe(false)
    expect(scroller.style.getPropertyValue('scroll-behavior')).toBe('smooth')
    lease?.stop()
  })

  it('restores inline values and priorities, cancels work, and ignores stale callbacks on release', () => {
    const { scroller, layout } = fixture()
    const lease = preserveChatScroll(document.body, 310)
    expect(scroller.style.getPropertyValue('overflow-anchor')).toBe('none')
    lease?.stop()
    lease?.stop()
    const pendingFrame = vi.mocked(requestAnimationFrame).mock.calls[0]?.[0]
    pendingFrame?.(0)
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    expect(scroller.style.getPropertyValue('overflow-anchor')).toBe('auto')
    expect(scroller.style.getPropertyPriority('overflow-anchor')).toBe('')
    expect(scroller.style.getPropertyValue('scroll-behavior')).toBe('smooth')
    expect(scroller.style.getPropertyPriority('scroll-behavior')).toBe('important')
    layout.top = 100
    vi.runAllTimers()
    lease?.restore()
    expect(scroller.scrollTop).toBe(250)
    expect(vi.getTimerCount()).toBe(0)
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  })

  it('finishes the last correction at the transition deadline and then restores native scrolling', () => {
    const { scroller, layout } = fixture(true)
    preserveChatScroll(document.body, 310)
    layout.height = 280
    vi.advanceTimersByTime(310)
    expect(scroller.scrollTop).toBe(720)
    expect(scroller.style.getPropertyValue('scroll-behavior')).toBe('smooth')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('suppresses the jump control only for animated bottom following, including nested measurement', () => {
    fixture(true)
    const lease = preserveChatScroll(document.body, 310)
    expect(document.body.classList.contains('ylc-chat-scroll-following')).toBe(true)
    const measurement = preserveChatScroll(document.body, 0)
    measurement?.restore()
    measurement?.stop()
    expect(document.body.classList.contains('ylc-chat-scroll-following')).toBe(true)
    vi.advanceTimersByTime(310)
    expect(document.body.classList.contains('ylc-chat-scroll-following')).toBe(false)
    lease?.stop()
    fixture(false)
    const history = preserveChatScroll(document.body, 310)
    expect(document.body.classList.contains('ylc-chat-scroll-following')).toBe(false)
    history?.stop()
  })

  it.each(['wheel', 'touchstart', 'pointerdown', 'keydown'])('restores the native jump control immediately on %s', type => {
    fixture(true)
    const lease = preserveChatScroll(document.body, 310)
    document.body.dispatchEvent(
      type === 'keydown' ? new KeyboardEvent(type, { key: 'PageUp', bubbles: true }) : new Event(type, { bubbles: true }),
    )
    expect(document.body.classList.contains('ylc-chat-scroll-following')).toBe(false)
    lease?.stop()
  })

  it('does not overwrite a newer native inline style or retain a replaced reading row', () => {
    const { scroller, anchor, layout } = fixture()
    const lease = preserveChatScroll(document.body, 310)
    scroller.style.setProperty('overflow-anchor', 'auto', 'important')
    anchor.remove()
    layout.top = 100
    lease?.restore()
    expect(scroller.scrollTop).toBe(250)
    expect(scroller.style.getPropertyValue('overflow-anchor')).toBe('auto')
    expect(scroller.style.getPropertyPriority('overflow-anchor')).toBe('important')
    expect(vi.getTimerCount()).toBe(0)
  })
})
