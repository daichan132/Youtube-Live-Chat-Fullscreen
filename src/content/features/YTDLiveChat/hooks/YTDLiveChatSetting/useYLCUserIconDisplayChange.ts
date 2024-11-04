import { useCallback } from 'react'

import { useYTDLiveChatNoLsStore } from '@/stores'

export const useYLCUserIconDisplayChange = () => {
  const changeUserIconDisplay = useCallback((display: boolean) => {
    const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement
    const iframeDocument = iframeElement?.contentDocument?.documentElement
    if (!iframeDocument) return
    iframeDocument.style.setProperty('--extension-user-icon-display', display ? 'inline' : 'none')
  }, [])
  const changeDisplay = useCallback(
    (display: boolean) => {
      changeUserIconDisplay(display)
    },
    [changeUserIconDisplay],
  )
  return { changeDisplay }
}
