import { useCallback } from 'react'

type PointerEventsValue = 'none' | 'all' | 'auto'

/**
 * Hook to manage pointer events for the YouTube app element
 * Provides a function to set pointer-events CSS property on the YouTube app element
 */
export const useYouTubePointerEvents = () => {
  /**
   * Sets the pointer-events CSS property on the YouTube app element
   * @param value - The pointer-events value to set ('none', 'all', or 'auto')
   * @returns boolean indicating if the operation was successful
   */
  const setYouTubePointerEvents = useCallback((value: PointerEventsValue): boolean => {
    const ytdAppElement = document.body.querySelector('ytd-app')
    if (!(ytdAppElement instanceof HTMLElement)) return false

    ytdAppElement.style.setProperty('pointer-events', value)
    return true
  }, [])

  return { setYouTubePointerEvents }
}
