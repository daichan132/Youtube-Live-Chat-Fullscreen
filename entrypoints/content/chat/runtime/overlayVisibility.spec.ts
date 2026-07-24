import { describe, expect, it } from 'vitest'
import { shouldShowOverlay } from './overlayVisibility'

describe('shouldShowOverlay', () => {
  it('returns false when user toggle is disabled', () => {
    expect(
      shouldShowOverlay({
        enabled: false,
        sourceReady: true,
        isFullscreen: true,
        alwaysOnDisplay: true,
        nativeChatOpen: false,
      }),
    ).toBe(false)
  })

  it('shows overlay in fullscreen only when source is ready', () => {
    expect(
      shouldShowOverlay({
        enabled: true,
        sourceReady: true,
        isFullscreen: true,
        alwaysOnDisplay: false,
        nativeChatOpen: true,
      }),
    ).toBe(true)

    expect(
      shouldShowOverlay({
        enabled: true,
        sourceReady: false,
        isFullscreen: true,
        alwaysOnDisplay: true,
        nativeChatOpen: false,
      }),
    ).toBe(false)
  })

  it('shows inline only when Always On is enabled and native chat is closed', () => {
    expect(
      shouldShowOverlay({
        enabled: true,
        sourceReady: true,
        isFullscreen: false,
        alwaysOnDisplay: true,
        nativeChatOpen: false,
      }),
    ).toBe(true)

    expect(
      shouldShowOverlay({
        enabled: true,
        sourceReady: true,
        isFullscreen: false,
        alwaysOnDisplay: true,
        nativeChatOpen: true,
      }),
    ).toBe(false)

    expect(
      shouldShowOverlay({
        enabled: true,
        sourceReady: true,
        isFullscreen: false,
        alwaysOnDisplay: false,
        nativeChatOpen: false,
      }),
    ).toBe(false)
  })
})
