import { useCallback, useLayoutEffect } from 'react'

import { useYTDLiveChatStore } from '@/shared/stores'

export const WindowResizeEffect = () => {
  const updatePosition = useCallback(() => {
    const innerWidth = window.innerWidth
    const {
      size: { width, height },
      coordinates: { x, y },
      setCoordinates,
      setSize,
    } = useYTDLiveChatStore.getState()
    const dx = x + width - innerWidth
    const newX = x - (dx > 0 ? dx : 0)
    const newWidth = width - (dx > 0 ? dx : 0)
    if (newX >= 0) {
      setCoordinates({ x: newX, y })
    } else if (newWidth >= 0) {
      setSize({ width: newWidth, height: height })
    }
  }, [])
  useLayoutEffect(() => {
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [updatePosition])
  return null
}
