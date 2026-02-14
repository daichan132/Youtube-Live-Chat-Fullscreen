import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFullscreenChatLayoutFix } from './useFullscreenChatLayoutFix'

const STYLE_ID = 'ylc-fullscreen-chat-layout-fix'
const CLASS_NAME = 'ylc-fullscreen-chat-fix'

const TestComponent = ({ active }: { active: boolean }) => {
  useFullscreenChatLayoutFix(active)
  return null
}

describe('useFullscreenChatLayoutFix', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.head.innerHTML = ''
    document.documentElement.classList.remove(CLASS_NAME)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds the style tag and html class when active', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const { unmount } = render(<TestComponent active />)

    expect(document.documentElement.classList.contains(CLASS_NAME)).toBe(true)
    const style = document.getElementById(STYLE_ID)
    expect(style).not.toBeNull()
    expect(style?.textContent).toContain('#secondary-inner')
    expect(style?.textContent).toContain('#panels-full-bleed-container #chat-container')
    expect(style?.textContent).toContain('width: 400px !important;')

    vi.runAllTimers()
    expect(dispatchSpy).toHaveBeenCalled()

    unmount()

    expect(document.documentElement.classList.contains(CLASS_NAME)).toBe(false)
    expect(document.getElementById(STYLE_ID)).toBeNull()

    dispatchSpy.mockRestore()
  })
})
