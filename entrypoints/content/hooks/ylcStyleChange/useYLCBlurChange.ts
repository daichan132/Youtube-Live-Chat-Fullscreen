import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'

export const useYLCBlurChange = () => {
  const { iframeElement } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      iframeElement: state.iframeElement,
    })),
  )

  const changeBlur = useCallback(
    (blur: number) => {
      const body = iframeElement?.contentDocument?.body
      if (body) {
        body.style.backdropFilter = `blur(${blur}px)`
        body.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px)`)
      }
    },
    [iframeElement],
  )

  return { changeBlur }
}
