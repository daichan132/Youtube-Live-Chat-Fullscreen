import { describe, expect, it } from 'vitest'
import type { PageEvidence } from '../platform/youtube/types'
import { assessCompatibilityFingerprint, buildCompatibilityFingerprint, type CompatibilityFingerprint } from './compatibilityFingerprint'

const evidence: PageEvidence = {
  generation: 3,
  videoId: 'private-video-id',
  route: 'watch',
  fullscreen: true,
  videoMode: 'archive',
  chatAvailability: 'ready',
  capabilities: {
    canBorrowNativeChat: true,
    canCreateManagedLiveChat: false,
    canOpenArchiveChat: true,
    canRestoreNativeChat: true,
    canMountOverlay: true,
    canMountPlayerSwitch: true,
  },
  sourceKind: 'native-replay',
  probeIds: ['player.v1.1', 'controls.right.v1.1', 'chat.iframe.v2.2', 'chat.archive.sidebar.v1.1'],
}

describe('compatibility fingerprint', () => {
  it('contains selector and capability evidence without page identity', () => {
    const fingerprint = buildCompatibilityFingerprint(evidence)

    expect(fingerprint).toEqual({
      playerProbe: 'player.v1.1',
      controlsProbe: 'controls.right.v1.1',
      chatProbe: 'chat.iframe.v2.2',
      archiveControlProbe: 'chat.archive.sidebar.v1.1',
      mode: 'archive',
      source: 'borrowed-replay',
      capabilities: { overlay: true, playerSwitch: true, nativeRestore: true },
    })
    expect(JSON.stringify(fingerprint)).not.toContain('private-video-id')
  })

  it('marks fallback probes as degraded and missing capabilities as failed', () => {
    const degraded = buildCompatibilityFingerprint(evidence)
    expect(assessCompatibilityFingerprint(degraded)).toMatchObject({ state: 'degraded' })

    const failed: CompatibilityFingerprint = {
      ...degraded,
      playerProbe: null,
      capabilities: { ...degraded.capabilities, overlay: false },
    }
    expect(assessCompatibilityFingerprint(failed)).toMatchObject({
      state: 'failed',
      reasons: expect.arrayContaining(['player probe missing', 'overlay capability missing']),
    })
  })
})
