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
  return replayUnavailable ? url : null
}
