import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hasArchiveNativeOpenControl, isNativeChatToggleButton, openArchiveNativeChatPanel, openNativeChatPanel } from './nativeChat'

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

const createPlayerViewModelToggleButton = (label: string) => {
  const controls = document.createElement('div')
  controls.className = 'ytp-right-controls'

  const toggle = document.createElement('toggle-button-view-model')
  const button = document.createElement('button')
  button.setAttribute('aria-label', label)

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

    const opened = openArchiveNativeChatPanel()

    expect(opened).toBe(true)
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('does not click non-chat player toggles', () => {
    const button = createPlayerChatToggle({ label: 'Settings', pressed: 'false' })
    const clickSpy = vi.fn()
    button.click = clickSpy

    const opened = openArchiveNativeChatPanel()

    expect(opened).toBe(false)
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('falls back to sidebar show-hide button when player toggle is unavailable', () => {
    const button = createSidebarShowHideButton()
    const clickSpy = vi.fn()
    button.click = clickSpy

    const opened = openArchiveNativeChatPanel()

    expect(opened).toBe(true)
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

    const opened = openArchiveNativeChatPanel()

    expect(opened).toBe(false)
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('still tries to open when expanded marker exists but host is hidden', () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('live-chat-present-and-expanded', '')
    document.body.appendChild(watchFlexy)
    createChatFrame('https://www.youtube.com/live_chat_replay?v=test')

    const button = createSidebarShowHideButton()
    const host = button.closest('ytd-live-chat-frame') as HTMLElement
    host.style.display = 'none'
    const clickSpy = vi.fn()
    button.click = clickSpy

    const opened = openArchiveNativeChatPanel()

    expect(opened).toBe(true)
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('can click open when expanded marker exists but iframe is blank', () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('live-chat-present-and-expanded', '')
    document.body.appendChild(watchFlexy)
    createChatFrame('about:blank')

    const button = createSidebarShowHideButton()
    const clickSpy = vi.fn()
    button.click = clickSpy

    const opened = openArchiveNativeChatPanel()

    expect(opened).toBe(true)
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('falls back to onShowHideChat when button selectors are unavailable', () => {
    const host = document.createElement('ytd-live-chat-frame') as HTMLElement & {
      onShowHideChat?: () => void
    }
    const showHideSpy = vi.fn()
    host.onShowHideChat = showHideSpy
    document.body.appendChild(host)

    const opened = openArchiveNativeChatPanel()

    expect(opened).toBe(true)
    expect(showHideSpy).toHaveBeenCalledTimes(1)
  })
})

describe('openNativeChatPanel', () => {
  it('is an alias of archive opener', () => {
    const button = createSidebarShowHideButton()
    const clickSpy = vi.fn()
    button.click = clickSpy

    const opened = openNativeChatPanel()

    expect(opened).toBe(true)
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })
})

describe('hasArchiveNativeOpenControl', () => {
  it('returns true when sidebar show-hide button exists', () => {
    createSidebarShowHideButton()
    expect(hasArchiveNativeOpenControl()).toBe(true)
  })

  it('returns true when ytd-live-chat-frame has onShowHideChat handler', () => {
    const host = document.createElement('ytd-live-chat-frame') as HTMLElement & {
      onShowHideChat?: () => void
    }
    host.onShowHideChat = vi.fn()
    document.body.appendChild(host)

    expect(hasArchiveNativeOpenControl()).toBe(true)
  })

  it('returns false when no archive chat open control is available', () => {
    expect(hasArchiveNativeOpenControl()).toBe(false)
  })
})

describe('isNativeChatToggleButton', () => {
  it('returns false for non-chat toggle-view-model buttons in player controls', () => {
    const subtitlesButton = createPlayerViewModelToggleButton('Subtitles')

    expect(isNativeChatToggleButton(subtitlesButton)).toBe(false)
  })

  it('returns true for chat-labeled toggle-view-model buttons in player controls', () => {
    const chatButton = createPlayerViewModelToggleButton('Chat')

    expect(isNativeChatToggleButton(chatButton)).toBe(true)
  })
})
