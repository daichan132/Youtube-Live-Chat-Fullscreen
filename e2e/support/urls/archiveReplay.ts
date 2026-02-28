import { ensureArchiveNativeChatPlayable, openArchiveWatchPage } from '@e2e/support/diagnostics'
import type { Page } from '@playwright/test'
import { getE2ETestTargets } from '@e2e/config/testTargets'

export const extractVideoId = (url: string) => {
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

