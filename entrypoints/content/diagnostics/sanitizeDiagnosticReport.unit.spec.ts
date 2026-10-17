import { describe, expect, it } from 'vitest'
import type { PageEvidence } from '../platform/youtube/types'
import { createSanitizedDiagnosticReport, detectBrowserFamily } from './sanitizeDiagnosticReport'

describe('createSanitizedDiagnosticReport', () => {
  it('identifies Opera before its shared Chrome product token', () => {
    expect(
      detectBrowserFamily(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36 OPR/134.0.0.0',
      ),
    ).toBe('opera')
  })

  it('omits page identity and DOM data from exported diagnostics', () => {
    const evidence: PageEvidence = {
      generation: 2,
      videoId: 'secret-video-id',
      route: 'watch',
      fullscreen: true,
      videoMode: 'live',
      chatAvailability: 'ready',
      capabilities: {
        canBorrowNativeChat: true,
        canCreateManagedLiveChat: true,
        canOpenArchiveChat: false,
        canRestoreNativeChat: true,
        canMountOverlay: true,
        canMountPlayerSwitch: true,
      },
      sourceKind: 'native-live',
      probeIds: ['player.v1.1', 'controls.right.v1.1', 'chat.iframe.v2.1'],
    }
    const report = createSanitizedDiagnosticReport({
      extensionVersion: '2.3.14',
      browserFamily: 'chrome',
      generation: 2,
      evidence,
      state: { status: 'active', videoId: 'secret-video-id', mode: 'live', sourceKind: 'borrowed' },
      leases: {
        chat: { kind: 'borrowed-live', state: 'attached' },
        presentation: 'overlay-and-switch',
        layout: 'floating',
        restoringChatCount: 0,
      },
      events: [],
    })
    const serialized = JSON.stringify(report)

    expect(serialized).not.toContain('secret-video-id')
    expect(serialized).not.toContain('HTMLElement')
    expect(report.page).toMatchObject({ mode: 'live', fullscreen: true })
  })
})
