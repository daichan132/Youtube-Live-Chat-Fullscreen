import { useEffect, useState } from 'react'
import { hasPlayableLiveChat } from '@/entrypoints/content/utils/hasPlayableLiveChat'

export const useHasPlayableLiveChat = () => {
  const [hasPlayableChat, setHasPlayableChat] = useState(false)

  useEffect(() => {
    setHasPlayableChat(false)
    let count = 0
    const interval = window.setInterval(() => {
      if (hasPlayableLiveChat()) {
        setHasPlayableChat(true)
        window.clearInterval(interval)
        return
      }
      count += 1
      if (count > 100) {
        window.clearInterval(interval)
      }
    }, 1000)
    return () => {
      window.clearInterval(interval)
    }
  }, [])

  return hasPlayableChat
}
