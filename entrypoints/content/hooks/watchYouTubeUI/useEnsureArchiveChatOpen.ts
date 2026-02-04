import { useEffect } from 'react'
import { getLiveChatIframe, hasPlayableLiveChat } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { isNativeChatOpen } from '@/entrypoints/content/utils/nativeChatState'

// Retry timing constants
const MAX_ENSURE_DURATION_MS = 120000
const INITIAL_RETRY_DELAY_MS = 1000
const MEDIUM_RETRY_DELAY_MS = 2000
const MAX_RETRY_DELAY_MS = 5000
const INITIAL_PHASE_ATTEMPTS = 10
const MEDIUM_PHASE_ATTEMPTS = 20

const isLiveNow = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  return Boolean(watchFlexy?.hasAttribute('is-live-now') || watchGrid?.hasAttribute('is-live-now'))
}

const tryClick = (selector: string) => {
  const target = document.querySelector<HTMLElement>(selector)
  if (!target) return false
  if (target instanceof HTMLButtonElement && target.disabled) return false
  target.click()
  return true
}

const openNativeChat = () => {
  const selectors = [
    'ytd-live-chat-frame #show-hide-button button',
    'ytd-live-chat-frame #show-hide-button yt-icon-button',
    '#chat-container #show-hide-button button',
    '#chat-container #show-hide-button yt-icon-button',
    'ytd-live-chat-frame button[aria-label*="Show chat"]',
    'ytd-live-chat-frame button[title*="Show chat"]',
    '#chat-container button[aria-label*="Show chat"]',
    '#chat-container button[title*="Show chat"]',
    'ytd-live-chat-frame button[aria-label*="Open chat"]',
    'ytd-live-chat-frame button[title*="Open chat"]',
    '#chat-container button[aria-label*="Open chat"]',
    '#chat-container button[title*="Open chat"]',
  ]

  for (const selector of selectors) {
    if (tryClick(selector)) return true
  }
  return false
}

export const useEnsureArchiveChatOpen = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return

    let isActive = true
    let timeoutId: number | null = null
    let attempts = 0
    let startTime = 0

    const clearTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      timeoutId = null
    }

    const getDelay = (attempt: number) => {
      if (attempt < INITIAL_PHASE_ATTEMPTS) return INITIAL_RETRY_DELAY_MS
      if (attempt < MEDIUM_PHASE_ATTEMPTS) return MEDIUM_RETRY_DELAY_MS
      return MAX_RETRY_DELAY_MS
    }

    const hasTimedOut = () => Date.now() - startTime >= MAX_ENSURE_DURATION_MS
    const getRemainingMs = () => MAX_ENSURE_DURATION_MS - (Date.now() - startTime)

    const scheduleNext = (delay: number) => {
      clearTimer()
      timeoutId = window.setTimeout(runCheck, delay)
    }

    const stopEnsure = () => {
      clearTimer()
    }

    const startEnsure = () => {
      attempts = 0
      startTime = Date.now()
      clearTimer()
      runCheck()
    }

    const runCheck = () => {
      if (!isActive) return
      if (hasTimedOut()) {
        stopEnsure()
        return
      }
      if (isLiveNow()) {
        stopEnsure()
        return
      }
      if (hasPlayableLiveChat() && getLiveChatIframe()) {
        stopEnsure()
        return
      }
      if (!isNativeChatOpen()) {
        openNativeChat()
      }
      attempts += 1
      const remainingMs = getRemainingMs()
      if (remainingMs <= 0) {
        stopEnsure()
        return
      }
      const delay = Math.min(getDelay(attempts), remainingMs)
      scheduleNext(delay)
    }

    const handleNavigate = () => {
      if (!isActive) return
      startEnsure()
    }

    startEnsure()
    document.addEventListener('yt-navigate-finish', handleNavigate)

    return () => {
      isActive = false
      clearTimer()
      document.removeEventListener('yt-navigate-finish', handleNavigate)
    }
  }, [enabled])
}
