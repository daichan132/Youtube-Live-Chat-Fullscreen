import { useEffect } from 'react'
import { isNativeChatOpen } from '@/entrypoints/content/utils/nativeChatState'

const isLiveNow = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  return Boolean(watchFlexy?.hasAttribute('is-live-now') || watchGrid?.hasAttribute('is-live-now'))
}

const hasReplayChatSignals = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  if (
    watchFlexy?.hasAttribute('live-chat-present') ||
    watchFlexy?.hasAttribute('live-chat-present-and-expanded') ||
    watchGrid?.hasAttribute('live-chat-present') ||
    watchGrid?.hasAttribute('live-chat-present-and-expanded')
  ) {
    return true
  }
  return Boolean(document.querySelector('ytd-live-chat-frame') || document.querySelector('#chatframe'))
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
    let attempts = 0
    const maxAttempts = 20
    const interval = window.setInterval(() => {
      if (isLiveNow()) {
        window.clearInterval(interval)
        return
      }
      if (!hasReplayChatSignals()) {
        attempts += 1
        if (attempts >= maxAttempts) {
          window.clearInterval(interval)
        }
        return
      }
      if (isNativeChatOpen()) {
        window.clearInterval(interval)
        return
      }
      openNativeChat()
      attempts += 1
      if (attempts >= maxAttempts) {
        window.clearInterval(interval)
      }
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [enabled])
}
