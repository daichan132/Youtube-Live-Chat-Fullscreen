import type { OverlayVisibilityInput } from './types'

export const shouldShowOverlay = ({ enabled, sourceReady, isFullscreen, alwaysOnDisplay, nativeChatOpen }: OverlayVisibilityInput) => {
  if (!enabled || !sourceReady) return false
  if (isFullscreen) return true
  return alwaysOnDisplay && !nativeChatOpen
}
