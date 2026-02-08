type OverlayVisibilityOptions = {
  ytdLiveChat: boolean
  isFullscreen: boolean
  canAttachFullscreenChat: boolean
  isShow: boolean
  isNativeChatCurrentlyOpen: boolean
}

export const shouldShowOverlay = ({
  ytdLiveChat,
  isFullscreen,
  canAttachFullscreenChat,
  isShow,
  isNativeChatCurrentlyOpen,
}: OverlayVisibilityOptions) => {
  if (!ytdLiveChat) return false
  if (isNativeChatCurrentlyOpen) return false

  return (isFullscreen && canAttachFullscreenChat) || isShow
}
