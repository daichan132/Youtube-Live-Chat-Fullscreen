import type { OverlayVisibilityInput } from './types'

export const shouldShowOverlay = ({ enabled, sourceReady, isFullscreen }: OverlayVisibilityInput) => enabled && sourceReady && isFullscreen
