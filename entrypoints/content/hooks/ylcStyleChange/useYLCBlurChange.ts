import { useCallback } from 'react'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'

export const useYLCBlurChange = () => {
  const changeBlur = useCallback((blur: number) => {
    const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement
    if (!iframeElement?.isConnected) return
    const body = iframeElement.contentDocument?.body
    if (!body) return
    const blurValue = blur > 0 ? `blur(${blur}px)` : 'none'
    body.style.backdropFilter = blurValue
    body.style.setProperty('-webkit-backdrop-filter', blurValue)
    iframeElement.style.filter = 'none'
    iframeElement.style.setProperty('-webkit-filter', 'none')
  }, [])

  return { changeBlur }
}
