import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'

export const useIconDisplay = () => {
  const alwaysOnDisplay = useYTDLiveChatStore(state => state.alwaysOnDisplay)
  const isDisplay = useYTDLiveChatNoLsStore(state => state.isDisplay)
  const isIframeLoaded = useYTDLiveChatNoLsStore(state => state.isIframeLoaded)

  return isIframeLoaded && (isDisplay || alwaysOnDisplay)
}
