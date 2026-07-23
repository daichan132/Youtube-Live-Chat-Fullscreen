import { useEffect } from 'react'
import { useYTDLiveChatStore } from '@/shared/stores/ytdLiveChatStore'
import { getYLCStyleDiff, getYLCStyleSnapshot } from '@/shared/utils/ylcStyleSnapshot'
import { changeYLCStyle } from './ylcStyleApplier'

export const useYLCStyleApplication = () => {
  useEffect(() => {
    let previousStyle = getYLCStyleSnapshot(useYTDLiveChatStore.getState())

    return useYTDLiveChatStore.subscribe(state => {
      const nextStyle = getYLCStyleSnapshot(state)
      const update = getYLCStyleDiff(previousStyle, nextStyle)
      previousStyle = nextStyle

      if (Object.keys(update).length > 0) {
        changeYLCStyle(update)
      }
    })
  }, [])
}
