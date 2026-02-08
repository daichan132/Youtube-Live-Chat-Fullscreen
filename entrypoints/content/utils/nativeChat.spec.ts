import { beforeEach, describe, expect, it, vi } from 'vitest'
import { openArchiveNativeChatPanel, openNativeChatPanel } from './nativeChat'

const createPlayerChatToggle = ({ label, pressed = 'false' }: { label: string; pressed?: 'true' | 'false' }) => {
  const controls = document.createElement('div')
  controls.className = 'ytp-right-controls'

  const toggle = document.createElement('toggle-button-view-model')
  const button = document.createElement('button')
  button.setAttribute('aria-label', label)
  button.setAttribute('aria-pressed', pressed)

  toggle.appendChild(button)
  controls.appendChild(toggle)
  document.body.appendChild(controls)

  return button
}

const createSidebarShowHideButton = () => {
  const host = document.createElement('ytd-live-chat-frame')
  const showHide = document.createElement('div')
  showHide.id = 'show-hide-button'
  const button = document.createElement('button')
  showHide.appendChild(button)
  host.appendChild(showHide)
  document.body.appendChild(host)
  return button
}

const createChatFrame = (src: string) => {
  const iframe = document.createElement('iframe')
  iframe.id = 'chatframe'
  iframe.setAttribute('src', src)
  document.body.appendChild(iframe)
  return iframe
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('openArchiveNativeChatPanel', () => {
  it('clicks player chat toggle when fullscreen control is available and unpressed', () => {
    const button = createPlayerChatToggle({ label: 'Live chat', pressed: 'false' })
    const clickSpy = vi.fn()
    button.click = clickSpy

    const selector = openArchiveNativeChatPanel()

    expect(selector).toContain('.ytp-right-controls')
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('does not click non-chat player toggles', () => {
    const button = createPlayerChatToggle({ label: 'Settings', pressed: 'false' })
    const clickSpy = vi.fn()
    button.click = clickSpy

    const selector = openArchiveNativeChatPanel()

    expect(selector).toBeNull()
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('falls back to sidebar show-hide button when player toggle is unavailable', () => {
    const button = createSidebarShowHideButton()
    const clickSpy = vi.fn()
    button.click = clickSpy

    const selector = openArchiveNativeChatPanel()

    expect(selector).toBe('ytd-live-chat-frame #show-hide-button button')
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('returns null when chat is already expanded and iframe is non-blank', () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('live-chat-present-and-expanded', '')
    document.body.appendChild(watchFlexy)
    createChatFrame('https://www.youtube.com/live_chat_replay?v=test')

    const button = createSidebarShowHideButton()
    const clickSpy = vi.fn()
    button.click = clickSpy

    const selector = openArchiveNativeChatPanel()

    expect(selector).toBeNull()
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('can click open when expanded marker exists but iframe is blank', () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('live-chat-present-and-expanded', '')
    document.body.appendChild(watchFlexy)
    createChatFrame('about:blank')

    const button = createSidebarShowHideButton()
    const clickSpy = vi.fn()
    button.click = clickSpy

    const selector = openArchiveNativeChatPanel()

    expect(selector).toBe('ytd-live-chat-frame #show-hide-button button')
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('falls back to ytd-live-chat-frame onShowHideChat when button clicks are unavailable', () => {
    const host = document.createElement('ytd-live-chat-frame') as HTMLElement & {
      onShowHideChat?: () => void
    }
    const showHideSpy = vi.fn()
    host.onShowHideChat = showHideSpy
    document.body.appendChild(host)

    const selector = openArchiveNativeChatPanel()

    expect(selector).toBe('ytd-live-chat-frame#onShowHideChat')
    expect(showHideSpy).toHaveBeenCalledTimes(1)
  })
})

describe('openNativeChatPanel', () => {
  it('is an alias of archive opener', () => {
    const button = createSidebarShowHideButton()
    const clickSpy = vi.fn()
    button.click = clickSpy

    const selector = openNativeChatPanel()

    expect(selector).toBe('ytd-live-chat-frame #show-hide-button button')
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })
})
