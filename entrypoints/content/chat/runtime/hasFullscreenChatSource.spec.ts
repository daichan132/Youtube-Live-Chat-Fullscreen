import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { getLiveChatDocument, getLiveChatIframe, isLiveChatUnavailable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { hasArchiveNativeOpenControl } from '@/entrypoints/content/utils/nativeChat'
import { resolveArchiveSource } from '../archive/resolveArchiveSource'
import { resolveLiveSource } from '../live/resolveLiveSource'
import { isIframeForCurrentVideo } from '../shared/iframeDom'
import { canToggleFullscreenChat, hasFullscreenChatSource } from './hasFullscreenChatSource'

vi.mock('../archive/resolveArchiveSource', () => ({
  resolveArchiveSource: vi.fn(),
}))

vi.mock('../live/resolveLiveSource', () => ({
  resolveLiveSource: vi.fn(),
}))

vi.mock('@/entrypoints/content/utils/getYouTubeVideoId', () => ({
  getYouTubeVideoId: vi.fn(),
}))

vi.mock('@/entrypoints/content/utils/hasPlayableLiveChat', () => ({
  getLiveChatIframe: vi.fn(),
  getLiveChatDocument: vi.fn(),
  isLiveChatUnavailable: vi.fn(),
}))

vi.mock('@/entrypoints/content/utils/nativeChat', () => ({
  hasArchiveNativeOpenControl: vi.fn(),
}))

vi.mock('../shared/iframeDom', () => ({
  isIframeForCurrentVideo: vi.fn(),
}))

describe('hasFullscreenChatSource', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.mocked(resolveLiveSource).mockReset()
    vi.mocked(resolveArchiveSource).mockReset()
    vi.mocked(getYouTubeVideoId).mockReset()
    vi.mocked(getLiveChatIframe).mockReset()
    vi.mocked(getLiveChatDocument).mockReset()
    vi.mocked(isLiveChatUnavailable).mockReset()
    vi.mocked(isIframeForCurrentVideo).mockReset()
    vi.mocked(hasArchiveNativeOpenControl).mockReset()
    vi.mocked(hasArchiveNativeOpenControl).mockReturnValue(false)
    vi.mocked(getYouTubeVideoId).mockReturnValue('video-a')
  })

  it('returns true in live mode when live source is resolved', () => {
    vi.mocked(resolveLiveSource).mockReturnValue({
      kind: 'live_direct',
      videoId: 'video-a',
      url: 'https://www.youtube.com/live_chat?v=video-a',
    })

    expect(hasFullscreenChatSource('live')).toBe(true)
    expect(resolveLiveSource).toHaveBeenCalledWith('video-a')
  })

  it('returns false in live mode when live source is unavailable', () => {
    vi.mocked(resolveLiveSource).mockReturnValue(null)

    expect(hasFullscreenChatSource('live')).toBe(false)
  })

  it('returns true in archive mode when archive source is resolved', () => {
    vi.mocked(resolveArchiveSource).mockReturnValue({
      kind: 'archive_borrow',
      iframe: document.createElement('iframe'),
    })

    expect(hasFullscreenChatSource('archive')).toBe(true)
    expect(resolveArchiveSource).toHaveBeenCalledTimes(1)
  })

  it('returns false in none mode', () => {
    expect(hasFullscreenChatSource('none')).toBe(false)
    expect(resolveLiveSource).not.toHaveBeenCalled()
    expect(resolveArchiveSource).not.toHaveBeenCalled()
  })
})

describe('canToggleFullscreenChat', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.mocked(resolveLiveSource).mockReset()
    vi.mocked(resolveArchiveSource).mockReset()
    vi.mocked(getYouTubeVideoId).mockReset()
    vi.mocked(getLiveChatIframe).mockReset()
    vi.mocked(getLiveChatDocument).mockReset()
    vi.mocked(isLiveChatUnavailable).mockReset()
    vi.mocked(isIframeForCurrentVideo).mockReset()
    vi.mocked(hasArchiveNativeOpenControl).mockReset()
    vi.mocked(hasArchiveNativeOpenControl).mockReturnValue(false)
    vi.mocked(getYouTubeVideoId).mockReturnValue('video-a')
  })

  it('returns false for none mode', () => {
    expect(canToggleFullscreenChat('none')).toBe(false)
  })

  it('uses strict source check for live mode', () => {
    vi.mocked(resolveLiveSource).mockReturnValue(null)
    expect(canToggleFullscreenChat('live')).toBe(false)

    vi.mocked(resolveLiveSource).mockReturnValue({
      kind: 'live_direct',
      videoId: 'video-a',
      url: 'https://www.youtube.com/live_chat?v=video-a',
    })
    expect(canToggleFullscreenChat('live')).toBe(true)
  })

  it('returns true for archive mode when strict source is resolved', () => {
    vi.mocked(resolveArchiveSource).mockReturnValue({
      kind: 'archive_borrow',
      iframe: document.createElement('iframe'),
    })

    expect(canToggleFullscreenChat('archive')).toBe(true)
  })

  it('returns false for archive mode when native iframe is explicitly unavailable', () => {
    vi.mocked(resolveArchiveSource).mockReturnValue(null)
    const iframe = document.createElement('iframe')
    vi.mocked(getLiveChatIframe).mockReturnValue(iframe)
    vi.mocked(isIframeForCurrentVideo).mockReturnValue(true)
    vi.mocked(getLiveChatDocument).mockReturnValue(document.implementation.createHTMLDocument())
    vi.mocked(isLiveChatUnavailable).mockReturnValue(true)

    expect(canToggleFullscreenChat('archive')).toBe(false)
  })

  it('returns false for archive mode while native iframe is still preparing', () => {
    vi.mocked(resolveArchiveSource).mockReturnValue(null)
    const iframe = document.createElement('iframe')
    vi.mocked(getLiveChatIframe).mockReturnValue(iframe)
    vi.mocked(isIframeForCurrentVideo).mockReturnValue(true)
    vi.mocked(getLiveChatDocument).mockReturnValue(null)

    expect(canToggleFullscreenChat('archive')).toBe(false)
  })

  it('returns true for archive mode when open control exists without iframe yet', () => {
    vi.mocked(resolveArchiveSource).mockReturnValue(null)
    vi.mocked(getLiveChatIframe).mockReturnValue(null)
    vi.mocked(hasArchiveNativeOpenControl).mockReturnValue(true)

    expect(canToggleFullscreenChat('archive')).toBe(true)
  })

  it('returns false for archive mode when no source hints exist', () => {
    vi.mocked(resolveArchiveSource).mockReturnValue(null)
    vi.mocked(getLiveChatIframe).mockReturnValue(null)
    vi.mocked(hasArchiveNativeOpenControl).mockReturnValue(false)

    expect(canToggleFullscreenChat('archive')).toBe(false)
  })
})
