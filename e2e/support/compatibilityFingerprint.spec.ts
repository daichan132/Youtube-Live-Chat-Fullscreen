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
  it('reports changed probes and nested capabilities without copying unrelated page metadata', () => {
    const previous = {
      ...primary,
      pageUrl: 'https://www.youtube.com/watch?v=private-previous',
      userName: 'private-user-before',
    }
    const next = {
      ...primary,
      chatProbe: 'chat.iframe.v2.2',
      mode: 'archive' as const,
      source: 'borrowed-replay' as const,
      capabilities: { overlay: false, playerSwitch: false, nativeRestore: true },
      pageUrl: 'https://www.youtube.com/watch?v=private-next',
      userName: 'private-user-after',
    }

    expect([...diffCompatibilityFingerprints(previous, next)].sort((left, right) => left.field.localeCompare(right.field))).toEqual([
      { field: 'chatProbe', previous: 'chat.iframe.v2.1', current: 'chat.iframe.v2.2' },
      { field: 'mode', previous: 'live', current: 'archive' },
      { field: 'overlay', previous: true, current: false },
      { field: 'playerSwitch', previous: true, current: false },
      { field: 'source', previous: 'borrowed-live', current: 'borrowed-replay' },
    ])
  })

  it('reports no changes without a baseline or for an unchanged reconstructed fingerprint', () => {
    expect(diffCompatibilityFingerprints(null, primary)).toEqual([])
    expect(diffCompatibilityFingerprints(primary, { ...primary, capabilities: { ...primary.capabilities } })).toEqual([])
  })
})
