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

  it.each(['player.live-time.v1.1', 'player.live-badge.v1.1'])('does not mistake %s for the player probe', liveUiProbe => {
    const fingerprint = buildCompatibilityFingerprint({
      ...evidence,
      probeIds: [liveUiProbe, ...evidence.probeIds.slice(1)],
    })

    expect(fingerprint.playerProbe).toBeNull()
    expect(assessCompatibilityFingerprint(fingerprint)).toEqual({ state: 'failed', reasons: ['player probe missing'] })
  })

  it('selects the actual player probe after unrelated live UI probes', () => {
    const fingerprint = buildCompatibilityFingerprint({
      ...evidence,
      probeIds: ['player.live-time.v1.1', 'player.live-badge.v1.1', ...evidence.probeIds],
    })

    expect(fingerprint.playerProbe).toBe('player.v1.1')
    expect(assessCompatibilityFingerprint(fingerprint)).toEqual({ state: 'degraded', reasons: ['chat fallback probe used'] })
  })

  it.each([
    { archiveProbe: 'chat.archive.player.v2.1', state: 'passed', reasons: [] },
    { archiveProbe: 'chat.archive.player.v2.3', state: 'degraded', reasons: ['archive control fallback probe used'] },
  ])('keeps archive player control $archiveProbe when the sidebar is absent', ({ archiveProbe, state, reasons }) => {
    const fingerprint = buildCompatibilityFingerprint({
      ...evidence,
      probeIds: ['player.v1.1', 'controls.right.v1.1', 'chat.iframe.v2.1', archiveProbe],
    })

    expect(fingerprint.archiveControlProbe).toBe(archiveProbe)
    expect(assessCompatibilityFingerprint(fingerprint)).toEqual({ state, reasons })
  })

  it('prefers the archive sidebar control even when a player control was observed first', () => {
    const fingerprint = buildCompatibilityFingerprint({
      ...evidence,
      probeIds: ['chat.archive.player.v2.3', 'player.v1.1', 'controls.right.v1.1', 'chat.iframe.v2.1', 'chat.archive.sidebar.v1.1'],
    })

    expect(fingerprint.archiveControlProbe).toBe('chat.archive.sidebar.v1.1')
    expect(assessCompatibilityFingerprint(fingerprint)).toEqual({ state: 'passed', reasons: [] })
  })
})
