import { describe, expect, it } from 'vitest'
import type { CompatibilityFingerprint } from '../../entrypoints/content/diagnostics/compatibilityFingerprint'
import { diffCompatibilityFingerprints } from './compatibilityFingerprint'

const primary: CompatibilityFingerprint = {
  playerProbe: 'player.v1.1',
  controlsProbe: 'controls.right.v1.1',
  chatProbe: 'chat.iframe.v2.1',
  archiveControlProbe: null,
  mode: 'live',
  source: 'borrowed-live',
  capabilities: { overlay: true, playerSwitch: true, nativeRestore: true },
}

describe('Canary compatibility fingerprint', () => {
  it('reports only sanitized field-level differences', () => {
    const next = { ...primary, chatProbe: 'chat.iframe.v2.2' }

    expect(diffCompatibilityFingerprints(primary, next)).toEqual([
      { field: 'chatProbe', previous: 'chat.iframe.v2.1', current: 'chat.iframe.v2.2' },
    ])
    expect(JSON.stringify(diffCompatibilityFingerprints(primary, next))).not.toContain('http')
  })
})
