import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGlobalSettingStore } from '@/shared/stores'
import { Content } from './Content'
import { useEnsureArchiveNativeChatOpen } from './chat/archive/useEnsureArchiveNativeChatOpen'
import { canToggleFullscreenChat } from './chat/runtime/hasFullscreenChatSource'
import { useChatMode } from './chat/runtime/useChatMode'
import { useContentRuntimeMessages } from './hooks/globalState/useContentRuntimeMessages'
import { useYLCPortalTargets } from './hooks/useYLCPortalTargets'
import { usePollingWithNavigate } from './hooks/watchYouTubeUI/usePollingWithNavigate'

const { ytdLiveChatMock, ytdLiveChatSwitchMock } = vi.hoisted(() => ({
  ytdLiveChatMock: vi.fn(() => null),
  ytdLiveChatSwitchMock: vi.fn(() => null),
}))

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
    portalsReady: false,
    shadowRoot: null,
    switchButtonContainer: null,
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
    ytdLiveChatMock.mockClear()
    ytdLiveChatSwitchMock.mockClear()
    useGlobalSettingStore.setState({ themeMode: 'system', ytdLiveChat: true })

    vi.mocked(usePollingWithNavigate).mockReturnValue(true)
    vi.mocked(canToggleFullscreenChat).mockReturnValue(true)
    vi.mocked(useChatMode).mockReturnValue('archive')
    vi.mocked(useYLCPortalTargets).mockReturnValue({
      portalsReady: false,
      shadowRoot: null,
      switchButtonContainer: null,
    })
  })

  const createReadyPortalTargets = () => {
    const host = document.createElement('div')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const switchButtonContainer = document.createElement('div')
    document.body.append(host, switchButtonContainer)

    vi.mocked(useYLCPortalTargets).mockReturnValue({
      portalsReady: true,
      shadowRoot,
      switchButtonContainer,
    })

    return { shadowRoot, switchButtonContainer }
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

  it('does not render overlay container when fullscreen chat cannot be toggled', () => {
    const { shadowRoot, switchButtonContainer } = createReadyPortalTargets()
    vi.mocked(usePollingWithNavigate).mockReturnValue(false)

    render(<Content />)

    expect(shadowRoot.querySelector('[data-ylc-overlay-container]')).toBeNull()
    expect(switchButtonContainer.style.display).toBe('none')
  })
})
