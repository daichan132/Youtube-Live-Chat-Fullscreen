import { useEffect, useState } from 'react'
import { useYTDLiveChatStore } from '@/shared/stores'

const gap = 10

export const useEnsureChatInViewport = (enabled: boolean) => {
  const [isChecked, setIsChecked] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setIsChecked(false)
      return
    }

    const innerWidth = window.innerWidth
    const innerHeight = window.innerHeight
    const {
      size: { width, height },
      coordinates: { x, y },
      setDefaultPosition,
    } = useYTDLiveChatStore.getState()
    if (x + gap < 0 || innerWidth + gap < width + x || y + gap < 0 || innerHeight + gap < height + y) {
      setDefaultPosition()
    }
    setIsChecked(true)
  }, [enabled])

  return isChecked
}
