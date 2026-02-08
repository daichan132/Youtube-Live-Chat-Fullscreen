import type { Page } from '@playwright/test'
import { acceptYouTubeConsent } from '../../utils/liveUrl'
import { isNativeReplayUnavailable, openArchiveWatchPage } from '../diagnostics'

const DEFAULT_ARCHIVE_PLAYLIST_WATCH_URL = 'https://www.youtube.com/watch?v=xyiEiNWaOfY&list=PLFZAmR0gqBTIoMCCUfEaKER4m6I98GrWj'
const DEFAULT_REPLAY_UNAVAILABLE_URL = 'https://www.youtube.com/watch?v=Q7VwUlT53RY'

const unique = (values: string[]) => Array.from(new Set(values))

const timeoutFromRemaining = (remainingMs: number, maxMs: number) => Math.max(1000, Math.min(maxMs, remainingMs))

const collectWatchUrlsFromCurrentPage = () => {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/watch"]'))
  const urls = anchors
    .map(anchor => anchor.getAttribute('href'))
    .filter(Boolean)
    .map(href => new URL(href as string, location.origin).toString())
    .filter(url => url.includes('/watch?') && url.includes('v='))
  return Array.from(new Set(urls))
}

const collectArchivePlaylistCandidates = async (page: Page, playlistWatchUrl: string, maxDurationMs: number) => {
  const deadline = Date.now() + maxDurationMs
  const candidates: string[] = [playlistWatchUrl]

  const gotoTimeout = timeoutFromRemaining(deadline - Date.now(), 20000)
  try {
    await page.goto(playlistWatchUrl, { waitUntil: 'domcontentloaded', timeout: gotoTimeout })
    await acceptYouTubeConsent(page)
    if (page.url().includes('consent')) {
      await page.waitForTimeout(1000)
      await acceptYouTubeConsent(page)
    }
    const extracted = await page.evaluate(collectWatchUrlsFromCurrentPage)
    for (const url of extracted) {
      if (url.includes('list=')) {
        candidates.push(url)
      }
    }
  } catch {
    // Fallback to hardcoded playlist watch URL only.
  }

  return unique(candidates)
}

export const selectArchiveReplayUrl = async (page: Page, options: { maxDurationMs?: number } = {}) => {
  const { maxDurationMs = 60000 } = options
  const explicitArchiveUrl = process.env.YLC_ARCHIVE_URL
  if (explicitArchiveUrl) {
    const ready = await openArchiveWatchPage(page, explicitArchiveUrl, { maxDurationMs: Math.min(maxDurationMs, 30000) })
    return ready ? explicitArchiveUrl : null
  }

  const candidates = await collectArchivePlaylistCandidates(page, DEFAULT_ARCHIVE_PLAYLIST_WATCH_URL, maxDurationMs)
  for (const candidate of candidates) {
    const ready = await openArchiveWatchPage(page, candidate, { maxDurationMs: 20000 })
    if (ready) return candidate
  }
  return null
}

export const selectArchiveReplayTransitionPair = async (page: Page, options: { maxDurationMs?: number } = {}) => {
  const { maxDurationMs = 90000 } = options
  const explicitArchiveUrl = process.env.YLC_ARCHIVE_URL
  const explicitArchiveNextUrl = process.env.YLC_ARCHIVE_NEXT_URL
  if (explicitArchiveUrl && explicitArchiveNextUrl && explicitArchiveUrl !== explicitArchiveNextUrl) {
    const fromReady = await openArchiveWatchPage(page, explicitArchiveUrl, { maxDurationMs: Math.min(maxDurationMs, 30000) })
    if (!fromReady) return null
    const toReady = await openArchiveWatchPage(page, explicitArchiveNextUrl, { maxDurationMs: 20000 })
    if (!toReady) return null
    return { fromUrl: explicitArchiveUrl, toUrl: explicitArchiveNextUrl }
  }

  const candidates = await collectArchivePlaylistCandidates(page, DEFAULT_ARCHIVE_PLAYLIST_WATCH_URL, maxDurationMs)
  const readyCandidates: string[] = []
  for (const candidate of candidates) {
    const ready = await openArchiveWatchPage(page, candidate, { maxDurationMs: 20000 })
    if (ready) {
      readyCandidates.push(candidate)
      if (readyCandidates.length >= 2) break
    }
  }

  if (readyCandidates.length < 2) return null
  return {
    fromUrl: readyCandidates[0],
    toUrl: readyCandidates[1],
  }
}

export const selectReplayUnavailableUrl = async (page: Page, options: { maxDurationMs?: number } = {}) => {
  const { maxDurationMs = 45000 } = options
  const candidates = unique([process.env.YLC_REPLAY_UNAVAILABLE_URL, DEFAULT_REPLAY_UNAVAILABLE_URL].filter(Boolean) as string[])
  const deadline = Date.now() + maxDurationMs

  for (const url of candidates) {
    const remainingBeforeGoto = deadline - Date.now()
    if (remainingBeforeGoto <= 0) break
    const gotoTimeout = timeoutFromRemaining(remainingBeforeGoto, 20000)
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: gotoTimeout })
      await acceptYouTubeConsent(page)
      if (page.url().includes('consent')) {
        await page.waitForTimeout(1000)
        await acceptYouTubeConsent(page)
      }
    } catch {
      continue
    }

    const remainingBeforePlayerCheck = deadline - Date.now()
    if (remainingBeforePlayerCheck <= 0) break
    const playerTimeout = timeoutFromRemaining(remainingBeforePlayerCheck, 10000)
    const hasPlayer = await page.waitForSelector('#movie_player', { state: 'attached', timeout: playerTimeout }).then(
      () => true,
      () => false,
    )
    if (!hasPlayer) continue

    const remainingBeforeFrameCheck = deadline - Date.now()
    if (remainingBeforeFrameCheck <= 0) break
    const frameTimeout = timeoutFromRemaining(remainingBeforeFrameCheck, 10000)
    const hasNativeFrame = await page.waitForSelector('#chatframe', { state: 'attached', timeout: frameTimeout }).then(
      () => true,
      () => false,
    )
    if (!hasNativeFrame) continue

    const remainingBeforeUnavailableCheck = deadline - Date.now()
    if (remainingBeforeUnavailableCheck <= 0) break
    const unavailableTimeout = timeoutFromRemaining(remainingBeforeUnavailableCheck, 8000)
    const replayUnavailable = await page.waitForFunction(isNativeReplayUnavailable, { timeout: unavailableTimeout }).then(
      () => true,
      () => false,
    )
    if (replayUnavailable) return url
  }

  return null
}
