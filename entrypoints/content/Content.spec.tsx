import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Content } from './Content'
import { useEnsureArchiveNativeChatOpen } from './chat/archive/useEnsureArchiveNativeChatOpen'
import { canToggleFullscreenChat } from './chat/runtime/hasFullscreenChatSource'
import { usePollingWithNavigate } from './hooks/watchYouTubeUI/usePollingWithNavigate'

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
  YTDLiveChatSwitch: () => null,
}))

vi.mock('./hooks/globalState/useI18n', () => ({
  useI18n: vi.fn(),
}))

vi.mock('./hooks/globalState/useYtdLiveChat', () => ({
  useYtdLiveChat: vi.fn(() => [true, vi.fn()] as const),
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
  YTDLiveChat: () => null,
}))

describe('Content', () => {
  beforeEach(() => {
    vi.mocked(usePollingWithNavigate).mockReset()
    vi.mocked(canToggleFullscreenChat).mockReset()
    vi.mocked(useEnsureArchiveNativeChatOpen).mockReset()

    vi.mocked(usePollingWithNavigate).mockReturnValue(true)
    vi.mocked(canToggleFullscreenChat).mockReturnValue(true)
  })

  it('latches switch polling once source becomes available', () => {
    render(<Content />)

    expect(usePollingWithNavigate).toHaveBeenCalledTimes(1)
    const options = vi.mocked(usePollingWithNavigate).mock.calls[0]?.[0]
    expect(options?.stopOnSuccess).toBe(true)
    expect(options?.intervalMs).toBe(1000)
    expect(options?.maxAttempts).toBe(Number.POSITIVE_INFINITY)

    options?.checkFn()
    expect(canToggleFullscreenChat).toHaveBeenCalledWith('archive')
  })

  it('enables archive native ensure only when archive + fullscreen + user enabled', () => {
    render(<Content />)

    expect(useEnsureArchiveNativeChatOpen).toHaveBeenCalledWith(true)
  })
})
