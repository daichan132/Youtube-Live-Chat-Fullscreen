import { useEffect } from 'react'
import { getLiveChatIframe, hasPlayableLiveChat } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { isNativeChatOpen } from '@/entrypoints/content/utils/nativeChatState'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'

/**
 * Retry timing constants for archive chat opening
 *
 * Archive videos may take time to load the chat iframe, so we use a progressive
 * backoff strategy: fast retries initially, then slower as time passes.
 */
const MAX_ENSURE_DURATION_MS = 60000 // 1 minute (reduced from 2 minutes)
const INITIAL_RETRY_DELAY_MS = 500 // Fast initial checks
const MEDIUM_RETRY_DELAY_MS = 1500
const MAX_RETRY_DELAY_MS = 3000
const INITIAL_PHASE_ATTEMPTS = 10 // First 10 attempts: 500ms intervals
const MEDIUM_PHASE_ATTEMPTS = 20 // Next 10 attempts: 1500ms intervals
const NO_CHAT_EARLY_EXIT_MS = 15000 // Give up early if no chat DOM after 15 seconds

/** Checks if the current video is a live stream (not an archive) */
const isLiveNow = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  return Boolean(watchFlexy?.hasAttribute('is-live-now') || watchGrid?.hasAttribute('is-live-now'))
}

/** Checks if the page has any chat-related DOM elements */
const hasChatFeature = () => {
  return Boolean(
    document.querySelector('ytd-live-chat-frame') || document.querySelector('#chat-container') || document.querySelector('#chatframe'),
  )
}

/** Attempts to click an element matching the selector */
const tryClick = (selector: string) => {
  const target = document.querySelector<HTMLElement>(selector)
  if (!target) return false
  if (target instanceof HTMLButtonElement && target.disabled) return false
  target.click()
  return true
}

/** Debug logging helper - only logs in development mode */
const debugLog = (message: string, ...args: unknown[]) => {
  if (import.meta.env.DEV) {
    // biome-ignore lint/suspicious/noConsole: Intentional debug logging for development troubleshooting
    console.debug(`[YLC Archive Chat] ${message}`, ...args)
  }
}

/**
 * Attempts to open the native YouTube chat by clicking the show/open button.
 * Tries multiple selectors to handle different YouTube UI variations.
 */
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
    if (tryClick(selector)) {
      debugLog('Opened native chat via selector:', selector)
      return true
    }
  }
  debugLog('Failed to open native chat - no matching button found')
  return false
}

/** Checks if we already have access to a live chat iframe */
const hasLiveChatIframe = () => Boolean(getLiveChatIframe() || useYTDLiveChatNoLsStore.getState().iframeElement)

/**
 * Hook that ensures archive chat is opened for the extension to use.
 *
 * Problem: On archive videos, the native chat may be closed by the user.
 * The extension needs the YouTube chat iframe to display chat in fullscreen.
 *
 * Solution: This hook automatically opens the native chat if it's closed,
 * allowing the extension to "borrow" the iframe for fullscreen display.
 *
 * @param enabled - Whether to actively ensure the chat is open
 */
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
        debugLog('Stopping: timeout reached')
        stopEnsure()
        return
      }
      // Live streams don't need this - they handle chat differently
      if (isLiveNow()) {
        debugLog('Stopping: detected live stream')
        stopEnsure()
        return
      }
      // Success: chat is ready
      if (hasPlayableLiveChat() && hasLiveChatIframe()) {
        debugLog('Success: chat is ready')
        stopEnsure()
        return
      }
      // Early exit: no chat feature on this page (e.g., regular video without chat replay)
      // Wait 15 seconds before giving up, as DOM may still be loading on slow connections
      const elapsedMs = Date.now() - startTime
      if (elapsedMs > NO_CHAT_EARLY_EXIT_MS && !hasChatFeature()) {
        debugLog('Stopping: no chat feature detected after', NO_CHAT_EARLY_EXIT_MS, 'ms')
        stopEnsure()
        return
      }
      if (!isNativeChatOpen()) {
        openNativeChat()
      }
      attempts += 1
      const remainingMs = getRemainingMs()
      if (remainingMs <= 0) {
        debugLog('Stopping: no remaining time')
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
