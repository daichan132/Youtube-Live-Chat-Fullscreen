import { describe, expect, it } from 'vitest'
import type { PageEvidence, PageTargets } from '../platform/youtube/types'
import { resolveChatDecision } from './resolveChatDecision'

const evidence = (overrides: Partial<PageEvidence> = {}): PageEvidence => ({
  generation: 1,
  videoId: 'ended-live',
  route: 'watch',
  fullscreen: true,
  videoMode: 'archive',
  chatAvailability: 'pending',
  capabilities: {
    canBorrowNativeChat: false,
    canCreateManagedLiveChat: false,
    canOpenArchiveChat: false,
    canRestoreNativeChat: false,
    canMountOverlay: true,
    canMountPlayerSwitch: true,
  },
  sourceKind: null,
  probeIds: [],
  ...overrides,
})

const targets: PageTargets = {
  player: null,
  fullscreenRoot: null,
  rightControls: null,
  nativeChatHost: null,
  nativeChatIframe: null,
  chatIframe: null,
  archiveOpenControl: null,
}

describe('resolveChatDecision archive transitions', () => {
  it('keeps an ended live video pending while replay UI is still materializing', () => {
    expect(resolveChatDecision(evidence(), targets)).toEqual({
      kind: 'pending',
      videoId: 'ended-live',
      mode: 'archive',
      canToggle: false,
    })
  })

  it('still marks an ordinary VOD without chat evidence unavailable', () => {
    expect(
      resolveChatDecision(
        evidence({
          videoMode: 'vod',
          chatAvailability: 'unavailable',
        }),
        targets,
      ),
    ).toEqual({ kind: 'unavailable', videoId: 'ended-live' })
  })
})
