import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearFullscreenChatLayout, setFullscreenChatLayout } from './fullscreenChatLayout'

describe('fullscreenChatLayout', () => {
  afterEach(() => {
    clearFullscreenChatLayout()
    vi.useRealTimers()
  })

  it('parks both native chat locations without collapsing iframe area', () => {
    vi.useFakeTimers()
    setFullscreenChatLayout(true)

    const style = document.getElementById('ylc-fullscreen-chat-layout-fix')
    expect(document.documentElement.classList.contains('ylc-fullscreen-chat-fix')).toBe(true)
    expect(style?.textContent).toContain('#panels-full-bleed-container')
    expect(style?.textContent).toContain('width: 400px')
    expect(style?.textContent).toContain('top: -200vh')
    expect(style?.textContent).toContain('visibility: hidden')
    expect(style?.textContent).not.toContain('width: 0')
  })

  it('cleans the injected style and pending timers', () => {
    vi.useFakeTimers()
    const resize = vi.fn()
    window.addEventListener('resize', resize)

    setFullscreenChatLayout(true)
    clearFullscreenChatLayout()
    vi.runAllTimers()

    expect(document.getElementById('ylc-fullscreen-chat-layout-fix')).toBeNull()
    expect(document.documentElement.classList.contains('ylc-fullscreen-chat-fix')).toBe(false)
    expect(resize).not.toHaveBeenCalled()
    window.removeEventListener('resize', resize)
  })

  it('retries YouTube layout recalculation after deactivation', () => {
    vi.useFakeTimers()
    const resize = vi.fn()
    window.addEventListener('resize', resize)

    setFullscreenChatLayout(true)
    setFullscreenChatLayout(false)
    vi.runAllTimers()

    expect(resize).toHaveBeenCalledTimes(3)
    window.removeEventListener('resize', resize)
  })
})
