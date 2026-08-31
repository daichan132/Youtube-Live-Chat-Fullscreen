import { describe, expect, it, vi } from 'vitest'
import { mutationTouchesChatBoundary } from './ChatRuntime'

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
      getManifest: () => ({ version: '2.3.15' }),
    },
  },
}))

describe('ChatRuntime live-state mutation boundary', () => {
  it('reconciles when YouTube removes the active class from the live time display', () => {
    const timeDisplay = document.createElement('div')
    timeDisplay.className = 'ytp-time-display'
    const mutation = {
      type: 'attributes',
      attributeName: 'class',
      target: timeDisplay,
    } as unknown as MutationRecord

    expect(mutationTouchesChatBoundary(mutation)).toBe(true)
  })

  it('reconciles when YouTube removes the live-head class from the player badge', () => {
    const liveBadge = document.createElement('div')
    liveBadge.className = 'ytp-live-badge'
    const mutation = {
      type: 'attributes',
      attributeName: 'class',
      target: liveBadge,
    } as unknown as MutationRecord

    expect(mutationTouchesChatBoundary(mutation)).toBe(true)
  })
})
