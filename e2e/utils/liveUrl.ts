import type { Page } from '@playwright/test'
import { getE2ETestTargets } from '../config/testTargets'

const nonLiveSearchUrl = 'https://www.youtube.com/results?search_query=big%20buck%20bunny&sp=EgIQAQ%253D%253D'
const archiveSearchUrls = [
  'https://www.youtube.com/results?search_query=live%20chat%20replay',
  'https://www.youtube.com/results?search_query=%E3%83%A9%E3%82%A4%E3%83%96%20%E9%85%8D%E4%BF%A1%20%E3%82%A2%E3%83%BC%E3%82%AB%E3%82%A4%E3%83%96',
]
const consentSelectors = [
  'button:has-text("I agree")',
  'button:has-text("Accept all")',
  'button:has-text("Accept the use of cookies")',
  'button:has-text("同意する")',
  'button:has-text("すべて同意")',
]

const LIVE_SEARCH_LIMIT = 18
const SEARCH_PAGE_TIMEOUT_MS = 20000
const CANDIDATE_GOTO_TIMEOUT_MS = 20000
const LIVE_CHAT_READY_TIMEOUT_MS = 12000

const addConsentCookies = async (page: Page) => {
  await page.context().addCookies([
    { name: 'CONSENT', value: 'YES+1', domain: '.youtube.com', path: '/', secure: true, sameSite: 'Lax' },
    { name: 'CONSENT', value: 'YES+1', domain: '.google.com', path: '/', secure: true, sameSite: 'Lax' },
  ])
}

const isPlayableVideoPath = (pathname: string) => pathname.startsWith('/watch') || /\/live\/[a-zA-Z0-9_-]+$/.test(pathname)

const hasVideoId = (url: URL) => Boolean(url.searchParams.get('v')) || /\/live\/[a-zA-Z0-9_-]+$/.test(url.pathname)

const normalizeVideoUrl = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl, 'https://www.youtube.com')
    if (!isPlayableVideoPath(url.pathname)) return null
    if (!hasVideoId(url)) return null
    if (url.pathname.startsWith('/shorts/')) return null
    return url.toString()
  } catch {
    return null
  }
}

export const acceptYouTubeConsent = async (page: Page) => {
  for (const selector of consentSelectors) {
    const button = page.locator(selector).first()
    if (await button.isVisible({ timeout: 1500 }).catch(() => false)) {
      await button.click()
      return
    }
  }
}

const collectVideoUrls = () => {
  const selectors = [
    'ytd-rich-item-renderer a#thumbnail',
    'ytd-video-renderer a#thumbnail',
    'ytd-grid-video-renderer a#thumbnail',
    'ytd-rich-item-renderer a#video-title-link',
    'ytd-video-renderer a#video-title',
  ]
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(selectors.join(', ')))
  const urls = anchors
    .map(anchor => anchor.getAttribute('href'))
    .filter(Boolean)
    .map(href => new URL(href as string, location.origin).toString())
  return Array.from(new Set(urls))
}

const isChatUnavailable = () => {
  const chatFrame =
    (document.querySelector('#chatframe') as HTMLIFrameElement | null) ??
    (document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame') as HTMLIFrameElement | null)
  const doc = chatFrame?.contentDocument ?? null
  const href = doc?.location?.href ?? ''
  if (!doc || !href || href.includes('about:blank')) return false
  if (doc.querySelector('yt-live-chat-unavailable-message-renderer')) return true
  const text = doc.body?.textContent?.toLowerCase() ?? ''
  if (!text) return false
  return (
    text.includes('live chat replay is not available') ||
    text.includes('chat is disabled') ||
    text.includes('live chat is disabled')
  )
}

const hasPlayableChat = () => {
  const chatFrame =
    (document.querySelector('#chatframe') as HTMLIFrameElement | null) ??
    (document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame') as HTMLIFrameElement | null)
  const doc = chatFrame?.contentDocument ?? null
  const href = doc?.location?.href ?? ''
  if (!doc || !href || href.includes('about:blank')) return false
  if (doc.querySelector('yt-live-chat-unavailable-message-renderer')) return false
  const text = doc.body?.textContent?.toLowerCase() ?? ''
  if (
    text.includes('live chat replay is not available') ||
    text.includes('chat is disabled') ||
    text.includes('live chat is disabled')
  ) {
    return false
  }
  const renderer = doc.querySelector('yt-live-chat-renderer')
  const itemList = doc.querySelector('yt-live-chat-item-list-renderer')
  return Boolean(renderer && itemList)
}

const hasChatSignals = () => {
  const liveChatFrame = document.querySelector('ytd-live-chat-frame')
  const chatFrame =
    document.querySelector('#chatframe') ?? document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame')
  return Boolean(liveChatFrame && chatFrame)
}

const isLiveNow = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  if (watchFlexy?.hasAttribute('is-live-now') || watchGrid?.hasAttribute('is-live-now')) return true

  const moviePlayer = document.getElementById('movie_player') as
    | (HTMLElement & { getVideoData?: () => { isLive?: boolean } })
    | null
  const videoData = moviePlayer?.getVideoData?.()
  if (typeof videoData?.isLive === 'boolean') return videoData.isLive

  const response = (
    window as Window & {
      ytInitialPlayerResponse?: {
        microformat?: {
          playerMicroformatRenderer?: {
            liveBroadcastDetails?: {
              isLiveNow?: boolean
            }
          }
        }
        videoDetails?: {
          isLive?: boolean
        }
      }
    }
  ).ytInitialPlayerResponse

  const liveBroadcastNow = response?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails?.isLiveNow
  if (typeof liveBroadcastNow === 'boolean') return liveBroadcastNow

  const videoDetailsLive = response?.videoDetails?.isLive
  if (typeof videoDetailsLive === 'boolean') return videoDetailsLive

  return false
}

const isWatchPageReady = async (page: Page) => {
  return page
    .waitForSelector('#movie_player', { state: 'attached', timeout: 10000 })
    .then(() => true, () => false)
}

const isPlayableLiveCandidate = async (page: Page, url: string) => {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: CANDIDATE_GOTO_TIMEOUT_MS })
  } catch {
    return false
  }

  await acceptYouTubeConsent(page)
  const ready = await isWatchPageReady(page)
  if (!ready) return false

  const liveNow = await page.evaluate(isLiveNow).then(Boolean, () => false)
  if (!liveNow) return false

  const hasChat = await page.waitForFunction(hasPlayableChat, { timeout: LIVE_CHAT_READY_TIMEOUT_MS }).then(
    () => true,
    () => false,
  )
  if (hasChat) return true

  const unavailable = await page.evaluate(isChatUnavailable)
  if (unavailable) return false

  const signals = await page.evaluate(hasChatSignals)
  if (!signals) return false

  return page.waitForFunction(hasPlayableChat, { timeout: 6000 }).then(
    () => true,
    () => false,
  )
}

let cachedLiveUrl: string | null = null

export const isWatchPageLiveNow = async (page: Page) => {
  return page.evaluate(isLiveNow).then(Boolean, () => false)
}

export const findLiveUrlWithChat = async (
  page: Page,
  options: { limit?: number; searchUrls?: string[]; maxDurationMs?: number } = {},
) => {
  const targets = getE2ETestTargets()
  const { limit = LIVE_SEARCH_LIMIT, searchUrls = targets.liveSearch.urls, maxDurationMs = 60000 } = options
  const deadline = Date.now() + maxDurationMs

  if (cachedLiveUrl) {
    const reusable = await isPlayableLiveCandidate(page, cachedLiveUrl)
    if (reusable) return cachedLiveUrl
    cachedLiveUrl = null
  }

  if (targets.live.preferredUrl) {
    const preferredReady = await isPlayableLiveCandidate(page, targets.live.preferredUrl)
    if (preferredReady) {
      cachedLiveUrl = targets.live.preferredUrl
      return targets.live.preferredUrl
    }
  }

  await addConsentCookies(page)
  const tried = new Set<string>()

  for (const searchUrl of searchUrls) {
    if (Date.now() > deadline) return null
    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: SEARCH_PAGE_TIMEOUT_MS })
    } catch {
      continue
    }
    await acceptYouTubeConsent(page)
    if (page.url().includes('consent')) {
      await page.waitForTimeout(1500)
      await acceptYouTubeConsent(page)
    }

    await page.waitForFunction(() => document.querySelectorAll('a#thumbnail').length > 0, { timeout: 15000 }).catch(() => null)
    const urls = await page.evaluate(collectVideoUrls)
    const candidates = urls.map(normalizeVideoUrl).filter(Boolean) as string[]

    let inspected = 0
    for (const candidate of candidates) {
      if (Date.now() > deadline) return null
      if (tried.has(candidate)) continue
      tried.add(candidate)
      inspected += 1
      if (inspected > limit) break

      const ready = await isPlayableLiveCandidate(page, candidate)
      if (ready) {
        cachedLiveUrl = candidate
        return candidate
      }
    }
  }

  return null
}

export const findVideoUrlWithoutChat = async (
  page: Page,
  options: { limit?: number; searchUrl?: string; maxDurationMs?: number } = {},
) => {
  const { limit = 8, searchUrl = nonLiveSearchUrl, maxDurationMs = 60000 } = options
  const deadline = Date.now() + maxDurationMs
  await addConsentCookies(page)

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: SEARCH_PAGE_TIMEOUT_MS })
  await acceptYouTubeConsent(page)
  if (page.url().includes('consent')) {
    await page.waitForTimeout(1500)
    await acceptYouTubeConsent(page)
  }

  await page.waitForFunction(() => document.querySelectorAll('a#thumbnail').length > 0, { timeout: 15000 }).catch(() => null)
  const urls = await page.evaluate(collectVideoUrls)
  const candidates = urls.map(normalizeVideoUrl).filter(Boolean).slice(0, limit) as string[]

  for (const url of candidates) {
    if (Date.now() > deadline) return null
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: CANDIDATE_GOTO_TIMEOUT_MS })
    await acceptYouTubeConsent(page)

    const playerReady = await isWatchPageReady(page)
    if (!playerReady) continue

    const hasChat = await page.waitForFunction(hasPlayableChat, { timeout: 8000 }).then(
      () => true,
      () => false,
    )
    if (hasChat) continue

    const signals = await page.evaluate(hasChatSignals)
    const unavailable = await page.evaluate(isChatUnavailable)
    if (!signals || unavailable) return url
  }

  return null
}

export const findArchiveUrlWithChat = async (
  page: Page,
  options: { limit?: number; searchUrls?: string[]; maxDurationMs?: number } = {},
) => {
  const { limit = 12, searchUrls = archiveSearchUrls, maxDurationMs = 60000 } = options
  const deadline = Date.now() + maxDurationMs
  await addConsentCookies(page)

  for (const searchUrl of searchUrls) {
    if (Date.now() > deadline) return null
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: SEARCH_PAGE_TIMEOUT_MS })
    await acceptYouTubeConsent(page)
    if (page.url().includes('consent')) {
      await page.waitForTimeout(1500)
      await acceptYouTubeConsent(page)
    }

    await page.waitForFunction(() => document.querySelectorAll('a#thumbnail').length > 0, { timeout: 15000 }).catch(() => null)
    const urls = await page.evaluate(collectVideoUrls)
    const candidates = urls.map(normalizeVideoUrl).filter(Boolean).slice(0, limit) as string[]

    for (const url of candidates) {
      if (Date.now() > deadline) return null
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: CANDIDATE_GOTO_TIMEOUT_MS })
      await acceptYouTubeConsent(page)

      const liveNow = await page.evaluate(isLiveNow)
      if (liveNow) continue

      const hasChat = await page.waitForFunction(hasPlayableChat, { timeout: 8000 }).then(
        () => true,
        () => false,
      )
      if (hasChat) return url
    }
  }

  return null
}
