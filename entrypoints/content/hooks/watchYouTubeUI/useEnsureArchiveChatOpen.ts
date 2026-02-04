import { useEffect } from 'react'
import { getLiveChatIframe, hasPlayableLiveChat } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { isNativeChatOpen } from '@/entrypoints/content/utils/nativeChatState'

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
    let interval: number | null = null

    const startEnsure = () => {
      let attempts = 0
      const maxAttempts = 120
      if (interval) window.clearInterval(interval)
      interval = window.setInterval(() => {
        if (isLiveNow()) {
          if (interval) window.clearInterval(interval)
          interval = null
          return
        }
        if (hasPlayableLiveChat() && getLiveChatIframe()) {
          if (interval) window.clearInterval(interval)
          interval = null
          return
        }
        if (isNativeChatOpen()) {
          attempts += 1
          if (attempts >= maxAttempts) {
            if (interval) window.clearInterval(interval)
            interval = null
          }
          return
        }
        openNativeChat()
        attempts += 1
        if (attempts >= maxAttempts) {
          if (interval) window.clearInterval(interval)
          interval = null
        }
      }, 1000)
    }

    const handleNavigate = () => {
      startEnsure()
    }

    startEnsure()
    document.addEventListener('yt-navigate-finish', handleNavigate)

    return () => {
      if (interval) window.clearInterval(interval)
      document.removeEventListener('yt-navigate-finish', handleNavigate)
    }
  }, [enabled])
}
