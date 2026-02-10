import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'

// Match YTDLiveChatIframe loading overlay exit duration to avoid icon flash during handoff.
const LOADING_OVERLAY_EXIT_MS = 320

export const useIconDisplay = () => {
  const { alwaysOnDisplay } = useYTDLiveChatStore(
    useShallow(state => ({
      alwaysOnDisplay: state.alwaysOnDisplay,
    })),
  )
  const { isDisplay, isIframeLoaded } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      isDisplay: state.isDisplay,
      isIframeLoaded: state.isIframeLoaded,
    })),
  )
  const [isLoadingTransitionComplete, setIsLoadingTransitionComplete] = useState(false)

  useEffect(() => {
    if (!isIframeLoaded) {
      setIsLoadingTransitionComplete(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsLoadingTransitionComplete(true)
    }, LOADING_OVERLAY_EXIT_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isIframeLoaded])

  return isLoadingTransitionComplete && (isDisplay || alwaysOnDisplay)
}
