import { useEffect, useState } from 'react'

export const useIsFullScreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(() => document.fullscreenElement !== null)

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement !== null) {
        setIsFullscreen(true)
      } else {
        setIsFullscreen(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    handleFullscreenChange()

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  return isFullscreen
}
