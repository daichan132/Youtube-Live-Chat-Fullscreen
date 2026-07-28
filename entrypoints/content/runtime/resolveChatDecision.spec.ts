import { describe, expect, it } from 'vitest'
import type { PageSnapshot } from './readPageSnapshot'
import { resolveChatDecision } from './resolveChatDecision'

const element = <T extends HTMLElement>() => ({}) as T

const createSnapshot = (overrides: Partial<PageSnapshot> = {}): PageSnapshot => ({
  videoId: 'video-1',
  isWatchPage: true,
  isFullscreen: true,
  player: element<HTMLDivElement>(),
  rightControls: element<HTMLDivElement>(),
  chatHost: null,
  chatIframe: null,
  nativeChatIframe: null,
  chatIframeManaged: false,
  playerIsLive: null,
  archiveOpenControlAvailable: false,
  chatUnavailable: false,
  chatDocumentReady: false,
  iframeMode: null,
  ...overrides,
})

describe('resolveChatDecision', () => {
  it('keeps non-fullscreen pages inactive', () => {
    expect(resolveChatDecision(createSnapshot({ isFullscreen: false }))).toEqual({
      kind: 'inactive',
      reason: 'not-fullscreen',
    })
  })

  it('uses the current native live iframe before managed fallback', () => {
    const iframe = element<HTMLIFrameElement>()
    expect(
      resolveChatDecision(
        createSnapshot({
          chatIframe: iframe,
          nativeChatIframe: iframe,
          iframeMode: 'live',
          playerIsLive: true,
        }),
      ),
    ).toEqual({
      kind: 'available',
      videoId: 'video-1',
      mode: 'live',
      source: {
        kind: 'live_borrow',
        videoId: 'video-1',
        iframe,
      },
    })
  })

  it('creates a managed iframe only for a strong live signal', () => {
    const decision = resolveChatDecision(createSnapshot({ playerIsLive: true }))
    expect(decision).toMatchObject({
      kind: 'available',
      videoId: 'video-1',
      mode: 'live',
      source: {
        kind: 'live_direct',
        videoId: 'video-1',
      },
    })
  })

  it('keeps an existing managed live iframe on the managed source path', () => {
    const iframe = element<HTMLIFrameElement>()
    expect(
      resolveChatDecision(
        createSnapshot({
          chatIframe: iframe,
          chatIframeManaged: true,
          iframeMode: 'live',
          playerIsLive: true,
        }),
      ),
    ).toEqual({
      kind: 'available',
      videoId: 'video-1',
      mode: 'live',
      source: {
        kind: 'live_direct',
        videoId: 'video-1',
        url: 'https://www.youtube.com/live_chat?v=video-1',
      },
    })
  })

  it('keeps archive pending until the replay document is ready', () => {
    const iframe = element<HTMLIFrameElement>()
    expect(
      resolveChatDecision(
        createSnapshot({
          chatIframe: iframe,
          nativeChatIframe: iframe,
          iframeMode: 'archive',
          archiveOpenControlAvailable: true,
        }),
      ),
    ).toEqual({
      kind: 'pending',
      videoId: 'video-1',
      mode: 'archive',
      canToggle: true,
    })
  })

  it('borrows the playable archive iframe without creating a managed replay', () => {
    const iframe = element<HTMLIFrameElement>()
    expect(
      resolveChatDecision(
        createSnapshot({
          chatIframe: iframe,
          nativeChatIframe: iframe,
          iframeMode: 'archive',
          chatDocumentReady: true,
          archiveOpenControlAvailable: true,
        }),
      ),
    ).toEqual({
      kind: 'available',
      videoId: 'video-1',
      mode: 'archive',
      source: {
        kind: 'archive_borrow',
        iframe,
      },
    })
  })

  it('marks an explicit unavailable document as terminal', () => {
    expect(resolveChatDecision(createSnapshot({ chatUnavailable: true }))).toEqual({
      kind: 'unavailable',
      videoId: 'video-1',
    })
  })

  it('does not expose a switch for a confirmed ordinary video', () => {
    expect(resolveChatDecision(createSnapshot({ playerIsLive: false }))).toEqual({
      kind: 'unavailable',
      videoId: 'video-1',
    })
  })
})
