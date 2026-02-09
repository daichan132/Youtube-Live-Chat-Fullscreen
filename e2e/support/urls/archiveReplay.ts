import type { Page } from '@playwright/test'
import { getE2ETestTargets } from '../../config/testTargets'
import { acceptYouTubeConsent } from '../../utils/liveUrl'
import { ensureArchiveNativeChatPlayable, ensureNativeReplayUnavailable, openArchiveWatchPage } from '../diagnostics'

const timeoutFromRemaining = (remainingMs: number, maxMs: number) => Math.max(1000, Math.min(maxMs, remainingMs))

const extractVideoId = (url: string) => {
  try {
    return new URL(url).searchParams.get('v')
  } catch {
    return null
  }
}

export const selectArchiveReplayUrl = async (page: Page, options: { maxDurationMs?: number } = {}) => {
  const { maxDurationMs = 60000 } = options
  const targets = getE2ETestTargets()
  const deadline = Date.now() + maxDurationMs
  const watchReady = await openArchiveWatchPage(page, targets.archive.replayUrl, {
    maxDurationMs: Math.min(maxDurationMs, 30000),
  })
  if (!watchReady) return null

  const remaining = deadline - Date.now()
  if (remaining <= 0) return null
  const playable = await ensureArchiveNativeChatPlayable(page, {
    maxDurationMs: Math.min(remaining, 30000),
  })
  return playable ? targets.archive.replayUrl : null
}

export const selectArchiveReplayTransitionPair = async (page: Page, options: { maxDurationMs?: number } = {}) => {
  const { maxDurationMs = 90000 } = options
  const targets = getE2ETestTargets()
  const { transitionFromUrl, transitionToUrl } = targets.archive
  const deadline = Date.now() + maxDurationMs

  if (transitionFromUrl === transitionToUrl) return null

  const fromVideoId = extractVideoId(transitionFromUrl)
  const toVideoId = extractVideoId(transitionToUrl)
  if (!fromVideoId || !toVideoId || fromVideoId === toVideoId) return null

  const fromReady = await openArchiveWatchPage(page, transitionFromUrl, {
    maxDurationMs: Math.min(maxDurationMs, 30000),
  })
  if (!fromReady) return null

  const remaining = deadline - Date.now()
  if (remaining <= 0) return null
  const playable = await ensureArchiveNativeChatPlayable(page, {
    maxDurationMs: Math.min(remaining, 30000),
  })
  if (!playable) return null

  return {
    fromUrl: transitionFromUrl,
    toUrl: transitionToUrl,
  }
}

export const selectReplayUnavailableUrl = async (page: Page, options: { maxDurationMs?: number } = {}) => {
  const { maxDurationMs = 45000 } = options
  const targets = getE2ETestTargets()
  const url = targets.replayUnavailable.url
  const deadline = Date.now() + maxDurationMs

  const remainingBeforeGoto = deadline - Date.now()
  if (remainingBeforeGoto <= 0) return null
  const gotoTimeout = timeoutFromRemaining(remainingBeforeGoto, 20000)
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: gotoTimeout })
    await acceptYouTubeConsent(page)
    if (page.url().includes('consent')) {
      await page.waitForTimeout(1000)
      await acceptYouTubeConsent(page)
    }
  } catch {
    return null
  }

  const remainingBeforePlayerCheck = deadline - Date.now()
  if (remainingBeforePlayerCheck <= 0) return null
  const playerTimeout = timeoutFromRemaining(remainingBeforePlayerCheck, 10000)
  const hasPlayer = await page.waitForSelector('#movie_player', { state: 'attached', timeout: playerTimeout }).then(
    () => true,
    () => false,
  )
  if (!hasPlayer) return null

  const remainingBeforeUnavailableCheck = deadline - Date.now()
  if (remainingBeforeUnavailableCheck <= 0) return null
  const replayUnavailable = await ensureNativeReplayUnavailable(page, {
    maxDurationMs: timeoutFromRemaining(remainingBeforeUnavailableCheck, 15000),
  })
  if (replayUnavailable) return url

  const fallbackNoPlayableReplay = await page
    .evaluate(() => {
      const iframe =
        (document.querySelector('#chatframe') as HTMLIFrameElement | null) ??
        (document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame') as HTMLIFrameElement | null)
      const host = document.querySelector('ytd-live-chat-frame')
      const container = document.querySelector('#chat-container')
      if (!host && !container) return false

      const readIframeHref = (target: HTMLIFrameElement | null) => {
        if (!target) return ''
        try {
          const docHref = target.contentDocument?.location?.href ?? ''
          if (docHref) return docHref
        } catch {
          // Ignore CORS/DOM access errors and fall back to src.
        }
        return target.getAttribute('src') ?? target.src ?? ''
      }

      const href = readIframeHref(iframe)
      const doc = iframe?.contentDocument ?? null
      const text = doc?.body?.textContent?.toLowerCase() ?? ''
      const unavailable =
        Boolean(doc?.querySelector('yt-live-chat-unavailable-message-renderer')) ||
        text.includes('live chat replay is not available') ||
        text.includes('chat is disabled') ||
        text.includes('live chat is disabled')

      const playable =
        Boolean(doc) &&
        Boolean(href) &&
        !href.includes('about:blank') &&
        href.includes('/live_chat_replay') &&
        !unavailable &&
        Boolean(doc?.querySelector('yt-live-chat-renderer') && doc?.querySelector('yt-live-chat-item-list-renderer'))

      return !playable
    })
    .catch(() => false)

  return fallbackNoPlayableReplay ? url : null
}
