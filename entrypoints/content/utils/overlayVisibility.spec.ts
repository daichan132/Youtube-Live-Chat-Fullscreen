import { describe, expect, it } from 'vitest'
import { shouldShowOverlay } from './overlayVisibility'

describe('shouldShowOverlay', () => {
  it('returns false when extension chat is disabled', () => {
    expect(
      shouldShowOverlay({
        ytdLiveChat: false,
        isFullscreen: true,
        canAttachFullscreenChat: true,
        isShow: true,
        isNativeChatCurrentlyOpen: false,
      }),
    ).toBe(false)
  })

  it('returns false when native chat is open, even in fullscreen', () => {
    expect(
      shouldShowOverlay({
        ytdLiveChat: true,
        isFullscreen: true,
        canAttachFullscreenChat: true,
        isShow: true,
        isNativeChatCurrentlyOpen: true,
      }),
    ).toBe(false)
  })

  it('returns true in fullscreen when chat source is attachable and native chat is closed', () => {
    expect(
      shouldShowOverlay({
        ytdLiveChat: true,
        isFullscreen: true,
        canAttachFullscreenChat: true,
        isShow: false,
        isNativeChatCurrentlyOpen: false,
      }),
    ).toBe(true)
  })

  it('returns true outside fullscreen when regular display conditions are met', () => {
    expect(
      shouldShowOverlay({
        ytdLiveChat: true,
        isFullscreen: false,
        canAttachFullscreenChat: false,
        isShow: true,
        isNativeChatCurrentlyOpen: false,
      }),
    ).toBe(true)
  })
})
