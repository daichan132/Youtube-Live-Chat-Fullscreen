import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { useGlobalSettingStore, useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import { Content } from './Content'
import { useEnsureArchiveNativeChatOpen } from './chat/archive/useEnsureArchiveNativeChatOpen'
import { canToggleFullscreenChat } from './chat/runtime/hasFullscreenChatSource'
import { useChatMode } from './chat/runtime/useChatMode'
import { useContentRuntimeMessages } from './hooks/globalState/useContentRuntimeMessages'
import { useYLCPortalTargets } from './hooks/useYLCPortalTargets'
import { useIsFullScreen } from './hooks/watchYouTubeUI/useIsFullscreen'
import { usePollingWithNavigate } from './hooks/watchYouTubeUI/usePollingWithNavigate'

const { ytdLiveChatMock, ytdLiveChatSwitchMock } = vi.hoisted(() => ({
  ytdLiveChatMock: vi.fn(() => null),
  ytdLiveChatSwitchMock: vi.fn(() => null),
}))

const noLsStoreBaseState = useYTDLiveChatNoLsStore.getState()

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('./chat/archive/useEnsureArchiveNativeChatOpen', () => ({
  useEnsureArchiveNativeChatOpen: vi.fn(),
}))

vi.mock('./chat/runtime/hasFullscreenChatSource', () => ({
  canToggleFullscreenChat: vi.fn(),
}))

vi.mock('./chat/runtime/useChatMode', () => ({
  useChatMode: vi.fn(() => 'archive'),
}))

vi.mock('./features/YTDLiveChatSwitch', () => ({
  YTDLiveChatSwitch: ytdLiveChatSwitchMock,
}))

vi.mock('./hooks/globalState/useContentRuntimeMessages', () => ({
  useContentRuntimeMessages: vi.fn(),
}))

vi.mock('./hooks/useYLCPortalTargets', () => ({
  useYLCPortalTargets: vi.fn(() => ({
    overlayRoot: null,
    switchContainer: null,
  })),
}))

vi.mock('./hooks/watchYouTubeUI/useIsFullscreen', () => ({
  useIsFullScreen: vi.fn(() => true),
}))

vi.mock('./hooks/watchYouTubeUI/usePollingWithNavigate', () => ({
  usePollingWithNavigate: vi.fn(),
}))

vi.mock('./YTDLiveChat', () => ({
  YTDLiveChat: ytdLiveChatMock,
}))

describe('Content', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.mocked(usePollingWithNavigate).mockReset()
    vi.mocked(canToggleFullscreenChat).mockReset()
    vi.mocked(useChatMode).mockReset()
    vi.mocked(useContentRuntimeMessages).mockReset()
    vi.mocked(useEnsureArchiveNativeChatOpen).mockReset()
    vi.mocked(useYLCPortalTargets).mockReset()
    vi.mocked(useIsFullScreen).mockReset()
    ytdLiveChatMock.mockClear()
    ytdLiveChatSwitchMock.mockClear()
    useGlobalSettingStore.setState({ themeMode: 'system', ytdLiveChat: true })
    useYTDLiveChatStore.setState({ alwaysOnDisplay: true })
    useYTDLiveChatNoLsStore.setState(noLsStoreBaseState, true)
    window.history.pushState({}, '', `${window.location.origin}/watch?v=video-a`)

    vi.mocked(usePollingWithNavigate).mockReturnValue(true)
    vi.mocked(canToggleFullscreenChat).mockReturnValue(true)
    vi.mocked(useChatMode).mockReturnValue('archive')
    vi.mocked(useIsFullScreen).mockReturnValue(true)
    vi.mocked(useYLCPortalTargets).mockReturnValue({
      overlayRoot: null,
      switchContainer: null,
    })
  })

  const createReadyPortalTargets = () => {
    const host = document.createElement('div')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const switchButtonContainer = document.createElement('div')
    document.body.append(host, switchButtonContainer)

    vi.mocked(useYLCPortalTargets).mockReturnValue({
      overlayRoot: shadowRoot,
      switchContainer: switchButtonContainer,
    })

    return { shadowRoot, switchButtonContainer }
  }

  const createUnavailableNativeLiveIframe = () => {
    const unavailable = document.createElement('yt-live-chat-unavailable-message-renderer')
    const body = document.createElement('body')
    body.appendChild(unavailable)
    const doc = {
      location: { href: 'https://www.youtube.com/live_chat?v=video-a' } as Location,
      body,
      querySelector: (selector: string) => (selector === 'yt-live-chat-unavailable-message-renderer' ? unavailable : null),
    } as unknown as Document

    const host = document.createElement('ytd-live-chat-frame')
    host.setAttribute('video-id', 'video-a')
    const iframe = document.createElement('iframe')
    iframe.id = 'chatframe'
    iframe.className = 'ytd-live-chat-frame'
    iframe.src = 'https://www.youtube.com/live_chat?v=video-a'
    Object.defineProperty(iframe, 'contentDocument', { value: doc, configurable: true })
    host.appendChild(iframe)
    document.body.appendChild(host)
  }

  it('keeps archive switch polling in continuous monitoring mode', () => {
    render(<Content />)

    expect(usePollingWithNavigate).toHaveBeenCalledTimes(1)
    const options = vi.mocked(usePollingWithNavigate).mock.calls[0]?.[0]
    expect(options?.stopOnSuccess).toBe(false)
    expect(options?.intervalMs).toBe(1000)
    expect(options?.maxAttempts).toBe(Number.POSITIVE_INFINITY)

    options?.checkFn()
    expect(canToggleFullscreenChat).toHaveBeenCalledWith('archive')
  })

  it('keeps live switch polling latched on success', () => {
    vi.mocked(useChatMode).mockReturnValue('live')

    render(<Content />)

    expect(usePollingWithNavigate).toHaveBeenCalledTimes(1)
    const options = vi.mocked(usePollingWithNavigate).mock.calls[0]?.[0]
    expect(options?.stopOnSuccess).toBe(true)

    options?.checkFn()
    expect(canToggleFullscreenChat).toHaveBeenCalledWith('live')
  })

  it('captures an unavailable native live iframe before starting source polling', () => {
    vi.mocked(useChatMode).mockReturnValue('live')
    createUnavailableNativeLiveIframe()

    render(<Content />)

    const options = vi.mocked(usePollingWithNavigate).mock.calls[0]?.[0]
    expect(options?.stopWhen?.()).toBe(true)
    expect(useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId).toBe('video-a')
    expect(canToggleFullscreenChat).not.toHaveBeenCalled()
  })

  it('restarts live source polling after terminal video changes without yt-navigate-finish', () => {
    vi.useFakeTimers()
    vi.mocked(useChatMode).mockReturnValue('live')
    useYTDLiveChatNoLsStore.setState({ unavailableLiveChatVideoId: 'video-a' })

    try {
      render(<Content />)
      const initialOptions = vi.mocked(usePollingWithNavigate).mock.calls[0]?.[0]
      expect(initialOptions?.stopWhen?.()).toBe(true)

      window.history.pushState({}, '', `${window.location.origin}/watch?v=video-b`)
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId).toBeNull()
      const latestOptions = vi.mocked(usePollingWithNavigate).mock.calls.at(-1)?.[0]
      expect(latestOptions?.stopWhen?.()).toBe(false)
      latestOptions?.checkFn()
      expect(canToggleFullscreenChat).toHaveBeenCalledWith('live')
    } finally {
      vi.useRealTimers()
    }
  })

  it('enables archive native ensure only when archive + fullscreen + user enabled', () => {
    render(<Content />)

    expect(useEnsureArchiveNativeChatOpen).toHaveBeenCalledWith(true)
  })

  it('disables archive native ensure when the user setting is off', () => {
    useGlobalSettingStore.setState({ ytdLiveChat: false })

    render(<Content />)

    expect(useEnsureArchiveNativeChatOpen).toHaveBeenCalledWith(false)
  })

  it('does not render overlay container in none mode', () => {
    const { shadowRoot, switchButtonContainer } = createReadyPortalTargets()
    vi.mocked(useChatMode).mockReturnValue('none')
    vi.mocked(usePollingWithNavigate).mockReturnValue(true)

    render(<Content />)

    expect(shadowRoot.querySelector('[data-ylc-overlay-container]')).toBeNull()
    expect(switchButtonContainer.style.display).toBe('none')
    expect(useEnsureArchiveNativeChatOpen).toHaveBeenCalledWith(false)
    expect(ytdLiveChatMock).not.toHaveBeenCalled()
    expect(ytdLiveChatSwitchMock).not.toHaveBeenCalled()
  })

  it('removes existing overlay and hides switch when mode changes to none', () => {
    const { shadowRoot, switchButtonContainer } = createReadyPortalTargets()
    vi.mocked(useChatMode).mockReturnValueOnce('archive').mockReturnValue('none')

    const { rerender } = render(<Content />)

    expect(shadowRoot.querySelector('[data-ylc-overlay-container]')).not.toBeNull()
    expect(switchButtonContainer.style.display).toBe('inline-block')

    rerender(<Content />)

    expect(shadowRoot.querySelector('[data-ylc-overlay-container]')).toBeNull()
    expect(switchButtonContainer.style.display).toBe('none')
  })

  it('places the fullscreen overlay on the shared base layer', () => {
    const { shadowRoot } = createReadyPortalTargets()

    render(<Content />)

    expect(shadowRoot.querySelector('[data-ylc-overlay-container]')).toHaveStyle({ zIndex: String(CONTENT_UI_LAYER.overlay) })
  })

  it('keeps the inline Always On overlay independent from the fullscreen switch target', () => {
    const host = document.createElement('div')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    document.body.append(host)
    useYTDLiveChatStore.setState({ alwaysOnDisplay: true })
    vi.mocked(useIsFullScreen).mockReturnValue(false)
    vi.mocked(useYLCPortalTargets).mockReturnValue({
      overlayRoot: shadowRoot,
      switchContainer: null,
    })

    render(<Content />)

    expect(useYLCPortalTargets).toHaveBeenCalledWith({
      overlayEnabled: true,
      switchEnabled: false,
    })
    expect(shadowRoot.querySelector('[data-ylc-overlay-container]')).not.toBeNull()
    expect(ytdLiveChatSwitchMock).not.toHaveBeenCalled()
  })

  it('does not render overlay container when fullscreen chat cannot be toggled', () => {
    const { shadowRoot, switchButtonContainer } = createReadyPortalTargets()
    vi.mocked(usePollingWithNavigate).mockReturnValue(false)

    render(<Content />)

    expect(shadowRoot.querySelector('[data-ylc-overlay-container]')).toBeNull()
    expect(switchButtonContainer.style.display).toBe('none')
  })

  it('hides both switch and overlay when current live chat is terminally unavailable', () => {
    const { shadowRoot, switchButtonContainer } = createReadyPortalTargets()
    vi.mocked(useChatMode).mockReturnValue('live')
    vi.mocked(usePollingWithNavigate).mockReturnValue(true)
    useYTDLiveChatNoLsStore.setState({ unavailableLiveChatVideoId: 'video-a' })

    render(<Content />)

    const options = vi.mocked(usePollingWithNavigate).mock.calls[0]?.[0]
    expect(options?.checkFn()).toBe(false)
    expect(canToggleFullscreenChat).not.toHaveBeenCalled()
    expect(shadowRoot.querySelector('[data-ylc-overlay-container]')).toBeNull()
    expect(switchButtonContainer.style.display).toBe('none')
    expect(ytdLiveChatMock).not.toHaveBeenCalled()
    expect(ytdLiveChatSwitchMock).not.toHaveBeenCalled()
  })
})
