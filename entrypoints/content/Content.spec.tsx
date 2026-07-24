import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { useGlobalSettingStore, useYTDLiveChatStore } from '@/shared/stores'
import { Content } from './Content'
import { useEnsureArchiveNativeChatOpen } from './chat/archive/useEnsureArchiveNativeChatOpen'
import { useChatAvailability } from './chat/runtime/useChatAvailability'
import { useChatMode } from './chat/runtime/useChatMode'
import { useContentRuntimeMessages } from './hooks/globalState/useContentRuntimeMessages'
import { useSettingsStorageSync } from './hooks/globalState/useSettingsStorageSync'
import { useYLCPortalTargets } from './hooks/useYLCPortalTargets'
import { useIsFullScreen } from './hooks/watchYouTubeUI/useIsFullscreen'

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

vi.mock('./chat/runtime/useChatAvailability', () => ({
  useChatAvailability: vi.fn(),
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

vi.mock('./hooks/globalState/useSettingsStorageSync', () => ({
  useSettingsStorageSync: vi.fn(),
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

vi.mock('./YTDLiveChat', () => ({
  YTDLiveChat: ytdLiveChatMock,
}))

describe('Content', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.mocked(useChatAvailability).mockReset()
    vi.mocked(useChatMode).mockReset()
    vi.mocked(useContentRuntimeMessages).mockReset()
    vi.mocked(useSettingsStorageSync).mockReset()
    vi.mocked(useEnsureArchiveNativeChatOpen).mockReset()
    vi.mocked(useYLCPortalTargets).mockReset()
    vi.mocked(useIsFullScreen).mockReset()
    ytdLiveChatMock.mockClear()
    ytdLiveChatSwitchMock.mockClear()
    useGlobalSettingStore.setState({ themeMode: 'system', ytdLiveChat: true })
    useYTDLiveChatStore.setState({ alwaysOnDisplay: true })
    window.history.pushState({}, '', `${window.location.origin}/watch?v=video-a`)

    vi.mocked(useChatAvailability).mockReturnValue({
      videoId: 'video-a',
      mode: 'archive',
      canShowSwitch: true,
      sourceReady: true,
      terminallyUnavailable: false,
    })
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
    vi.mocked(useChatAvailability).mockReturnValue({
      videoId: 'video-a',
      mode: 'archive',
      canShowSwitch: false,
      sourceReady: false,
      terminallyUnavailable: false,
    })

    render(<Content />)

    expect(shadowRoot.querySelector('[data-ylc-overlay-container]')).toBeNull()
    expect(switchButtonContainer.style.display).toBe('none')
  })

  it('hides both switch and overlay when current live chat is terminally unavailable', () => {
    const { shadowRoot, switchButtonContainer } = createReadyPortalTargets()
    vi.mocked(useChatMode).mockReturnValue('live')
    vi.mocked(useChatAvailability).mockReturnValue({
      videoId: 'video-a',
      mode: 'live',
      canShowSwitch: false,
      sourceReady: false,
      terminallyUnavailable: true,
    })

    render(<Content />)

    expect(shadowRoot.querySelector('[data-ylc-overlay-container]')).toBeNull()
    expect(switchButtonContainer.style.display).toBe('none')
    expect(ytdLiveChatMock).not.toHaveBeenCalled()
    expect(ytdLiveChatSwitchMock).not.toHaveBeenCalled()
  })
})
