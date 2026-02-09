import { useEffect, useState } from 'react'
import { detectChatMode } from './detectChatMode'
import type { ChatMode } from './types'

const MODE_CHECK_INTERVAL_MS = 1000

export const useChatMode = () => {
  const [mode, setMode] = useState<ChatMode>(() => detectChatMode())

  useEffect(() => {
    const syncMode = () => {
      setMode(detectChatMode())
    }

    syncMode()
    const interval = window.setInterval(syncMode, MODE_CHECK_INTERVAL_MS)
    document.addEventListener('yt-navigate-finish', syncMode)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('yt-navigate-finish', syncMode)
    }
  }, [])

  return mode
}
