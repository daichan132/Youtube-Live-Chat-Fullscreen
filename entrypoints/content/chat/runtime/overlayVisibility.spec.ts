import { describe, expect, it } from 'vitest'
import { shouldShowOverlay } from './overlayVisibility'

describe('shouldShowOverlay', () => {
  it('returns false when user toggle is disabled', () => {
    expect(
      shouldShowOverlay({
        userToggleEnabled: false,
        isFullscreen: true,
        fullscreenSourceReady: true,
        inlineVisible: true,
        nativeChatOpenIntent: false,
      }),
    ).toBe(false)
  })

  it('shows overlay in fullscreen only when source is ready', () => {
    expect(
      shouldShowOverlay({
        userToggleEnabled: true,
        isFullscreen: true,
        fullscreenSourceReady: true,
        inlineVisible: false,
        nativeChatOpenIntent: true,
      }),
    ).toBe(true)

    expect(
      shouldShowOverlay({
        userToggleEnabled: true,
        isFullscreen: true,
        fullscreenSourceReady: false,
        inlineVisible: true,
        nativeChatOpenIntent: false,
      }),
    ).toBe(false)
  })

  it('keeps inline overlay hidden when native chat is open', () => {
    expect(
      shouldShowOverlay({
        userToggleEnabled: true,
        isFullscreen: false,
        fullscreenSourceReady: false,
        inlineVisible: true,
        nativeChatOpenIntent: true,
      }),
    ).toBe(false)
  })
})
