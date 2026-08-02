import { describe, expect, it } from 'vitest'
import type { PageObservation } from '../platform/youtube/types'
import { resolveChatDecision } from './resolveChatDecision'

const element = <T extends HTMLElement>() => ({}) as T

type ObservationOptions = {
  videoId: string | null
  isWatchPage: boolean
  isFullscreen: boolean
  chatIframe: HTMLIFrameElement | null
  nativeChatIframe: HTMLIFrameElement | null
  chatIframeManaged: boolean
  playerIsLive: boolean | null
  archiveOpenControlAvailable: boolean
  chatUnavailable: boolean
  chatDocumentReady: boolean
  iframeMode: 'live' | 'archive' | null
}

const createSnapshot = (overrides: Partial<ObservationOptions> = {}): PageObservation => {
  const options: ObservationOptions = {
    videoId: 'video-1',
    isWatchPage: true,
    isFullscreen: true,
    chatIframe: null,
    nativeChatIframe: null,
    chatIframeManaged: false,
    playerIsLive: null,
    archiveOpenControlAvailable: false,
    chatUnavailable: false,
    chatDocumentReady: false,
    iframeMode: null,
    ...overrides,
  }
  const sourceKind =
    options.iframeMode === 'archive'
      ? 'native-replay'
      : options.iframeMode === 'live'
        ? options.chatIframeManaged
          ? 'managed-live'
          : 'native-live'
        : null
  return {
    evidence: {
      generation: 1,
      videoId: options.videoId,
      route: options.isWatchPage ? 'watch' : 'other',
      fullscreen: options.isFullscreen,
      videoMode:
        options.iframeMode === 'archive'
          ? 'archive'
          : options.playerIsLive === true || options.iframeMode === 'live'
            ? 'live'
            : options.playerIsLive === false
              ? 'vod'
              : 'unknown',
      chatAvailability: options.chatUnavailable
        ? 'unavailable'
        : options.iframeMode === 'archive' && !options.chatDocumentReady
          ? 'pending'
          : sourceKind || options.playerIsLive === true
            ? 'ready'
            : 'pending',
      capabilities: {
        canBorrowNativeChat: sourceKind === 'native-live' || (sourceKind === 'native-replay' && options.chatDocumentReady),
        canCreateManagedLiveChat: options.playerIsLive === true,
        canOpenArchiveChat: options.archiveOpenControlAvailable,
        canRestoreNativeChat: options.chatIframe !== null && !options.chatIframeManaged,
        canMountOverlay: true,
        canMountPlayerSwitch: true,
      },
      sourceKind,
      probeIds: [],
    },
    targets: {
      player: element<HTMLDivElement>(),
      fullscreenRoot: element<HTMLDivElement>(),
      rightControls: element<HTMLDivElement>(),
      nativeChatHost: null,
      nativeChatIframe: options.nativeChatIframe ?? (options.chatIframeManaged ? null : options.chatIframe),
      chatIframe: options.chatIframe,
      archiveOpenControl: null,
    },
  }
}

const decide = (observation: PageObservation) => resolveChatDecision(observation.evidence, observation.targets)

describe('resolveChatDecision', () => {
  it('keeps non-fullscreen pages inactive', () => {
    expect(decide(createSnapshot({ isFullscreen: false }))).toEqual({
      kind: 'inactive',
      reason: 'not-fullscreen',
    })
  })

  it('uses the current native live iframe before managed fallback', () => {
    const iframe = element<HTMLIFrameElement>()
    expect(
      decide(
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
    const decision = decide(createSnapshot({ playerIsLive: true }))
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
      decide(
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
      decide(
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
      decide(
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
    expect(decide(createSnapshot({ chatUnavailable: true }))).toEqual({
      kind: 'unavailable',
      videoId: 'video-1',
    })
  })

  it('does not expose a switch for a confirmed ordinary video', () => {
    expect(decide(createSnapshot({ playerIsLive: false }))).toEqual({
      kind: 'unavailable',
      videoId: 'video-1',
    })
  })
})
