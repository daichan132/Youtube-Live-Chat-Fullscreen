import { useEffect, useState } from 'react'
import { hasLiveChatSignals } from '@/entrypoints/content/utils/hasLiveChatSignals'

export const useHasLiveChatSignals = () => {
  const [hasChatSignals, setHasChatSignals] = useState(false)

  useEffect(() => {
    let interval: number | null = null

    const startCheck = () => {
      setHasChatSignals(false)
      let count = 0
      if (interval) window.clearInterval(interval)
      interval = window.setInterval(() => {
        if (hasLiveChatSignals()) {
          setHasChatSignals(true)
          if (interval) window.clearInterval(interval)
          interval = null
          return
        }
        count += 1
        if (count > 100) {
          if (interval) window.clearInterval(interval)
          interval = null
        }
      }, 1000)
    }

    const handleNavigate = () => {
      startCheck()
    }

    startCheck()
    document.addEventListener('yt-navigate-finish', handleNavigate)

    return () => {
      if (interval) window.clearInterval(interval)
      document.removeEventListener('yt-navigate-finish', handleNavigate)
    }
  }, [])

  return hasChatSignals
}
