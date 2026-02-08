import type { OverlayVisibilityInput } from './types'

export const shouldShowOverlay = ({
  userToggleEnabled,
  isFullscreen,
  fullscreenSourceReady,
  inlineVisible,
  nativeChatOpenIntent,
}: OverlayVisibilityInput) => {
  if (!userToggleEnabled) return false

  if (isFullscreen) {
    return fullscreenSourceReady
  }

  return inlineVisible && !nativeChatOpenIntent
}
