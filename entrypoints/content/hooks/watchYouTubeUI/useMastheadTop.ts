import { useCallback, useEffect, useState } from 'react'

export const useMastheadTop = (isFullscreen: boolean) => {
  const [isTop, setIsTop] = useState(false)

  const updateIsTopBasedOnMasthead = useCallback((element: Element, fullscreen: boolean) => {
    // Prefer explicit fullscreen state over DOM attributes which can flicker
    // when the window loses focus or UI updates.
    if (fullscreen || element.hasAttribute('masthead-hidden')) {
      setIsTop(true)
    } else {
      setIsTop(false)
    }
  }, [])

  useEffect(() => {
    const ytdAppElement = document.querySelector('ytd-app')
    if (!ytdAppElement) return
    updateIsTopBasedOnMasthead(ytdAppElement, isFullscreen)

    const observer = new MutationObserver((mutations: MutationRecord[]) => {
      for (const mutation of mutations) {
        if (mutation.target instanceof Element) {
          updateIsTopBasedOnMasthead(mutation.target, isFullscreen)
        }
      }
    })
    observer.observe(ytdAppElement, {
      attributeFilter: ['masthead-hidden'],
      attributes: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [updateIsTopBasedOnMasthead, isFullscreen])

  return isTop
}
