import { useHasPlayableLiveChat } from './useHasPlayableLiveChat'
import { useIsFullScreen } from './useIsFullscreen'
import { useEnsureChatInViewport } from './useEnsureChatInViewport'
import { useMastheadTop } from './useMastheadTop'
import { useNativeChatState } from './useNativeChatState'

export const useIsShow = () => {
  const hasPlayableChat = useHasPlayableLiveChat()
  const isFullscreen = useIsFullScreen()
  const isTop = useMastheadTop(isFullscreen)
  const { isNativeChatOpen, isNativeChatExpanded } = useNativeChatState(isFullscreen)
  const isChecked = useEnsureChatInViewport(hasPlayableChat && isTop)

  return { isShow: hasPlayableChat && isTop && isChecked, isNativeChatOpen, isNativeChatExpanded }
}
