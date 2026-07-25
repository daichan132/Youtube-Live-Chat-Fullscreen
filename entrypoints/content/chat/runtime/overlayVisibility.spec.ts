import { describe, expect, it } from 'vitest'
import { shouldShowOverlay } from './overlayVisibility'

describe('shouldShowOverlay', () => {
  it('returns false when user toggle is disabled', () => {
    expect(
      shouldShowOverlay({
        enabled: false,
        sourceReady: true,
        isFullscreen: true,
      }),
    ).toBe(false)
  })

  it('shows overlay in fullscreen only when source is ready', () => {
    expect(
      shouldShowOverlay({
        enabled: true,
        sourceReady: true,
        isFullscreen: true,
      }),
    ).toBe(true)

    expect(
      shouldShowOverlay({
        enabled: true,
        sourceReady: false,
        isFullscreen: true,
      }),
    ).toBe(false)
  })

  it('hides the overlay after fullscreen exits even when Always On is enabled', () => {
    expect(
      shouldShowOverlay({
        enabled: true,
        sourceReady: true,
        isFullscreen: false,
      }),
    ).toBe(false)

    expect(
      shouldShowOverlay({
        enabled: true,
        sourceReady: true,
        isFullscreen: false,
      }),
    ).toBe(false)

    expect(
      shouldShowOverlay({
        enabled: true,
        sourceReady: true,
        isFullscreen: false,
      }),
    ).toBe(false)
  })
})
