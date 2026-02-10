import { useCallback } from 'react'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'

const getConnectedIframeBody = () => {
  const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement
  if (!iframeElement?.isConnected) return null

  try {
    return { iframeElement, body: iframeElement.contentDocument?.body ?? null }
  } catch {
    return null
  }
}

export const useYLCBlurChange = () => {
  const changeBlur = useCallback((blur: number) => {
    const target = getConnectedIframeBody()
    if (!target?.body) return
    const blurValue = blur > 0 ? `blur(${blur}px)` : 'none'
    target.body.style.backdropFilter = blurValue
    target.body.style.setProperty('-webkit-backdrop-filter', blurValue)
    target.iframeElement.style.filter = 'none'
    target.iframeElement.style.setProperty('-webkit-filter', 'none')
  }, [])

  return { changeBlur }
}
