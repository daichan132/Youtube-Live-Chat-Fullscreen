import { useEffect } from 'react'
import { useYouTubePointerEvents } from '../../hooks/useYouTubePointerEvents'

interface HoverEffectProps {
  isDragging: boolean
}

/**
 * Manages pointer events for YouTube app element while dragging
 * Disables pointer events on the YouTube app when dragging to prevent interaction conflicts
 */
export const HoverEffect = ({ isDragging }: HoverEffectProps) => {
  const { setYouTubePointerEvents } = useYouTubePointerEvents()

  useEffect(() => {
    if (isDragging) {
      setYouTubePointerEvents('none')
    } else {
      setYouTubePointerEvents('all')
    }
  }, [isDragging, setYouTubePointerEvents])

  return null
}
