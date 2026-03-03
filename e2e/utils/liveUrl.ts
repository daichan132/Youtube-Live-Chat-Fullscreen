import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { Page } from '@playwright/test'
import { getE2ETestTargets } from '@e2e/config/testTargets'
import { TIMING } from '@e2e/support/constants'

const SHARED_LIVE_URL_PATH = path.join(os.tmpdir(), 'ylc-e2e-live-url.txt')

const readSharedLiveUrl = (): string | null => {
	try { return fs.readFileSync(SHARED_LIVE_URL_PATH, 'utf8').trim() || null }
	catch { return null }
}

const writeSharedLiveUrl = (url: string) => {
	try { fs.writeFileSync(SHARED_LIVE_URL_PATH, url) }
	catch { /* best-effort */ }
}

const log = (msg: string) => console.log(`[liveUrl] ${msg}`)

const consentSelectors = [
	'button:has-text("I agree")',
	'button:has-text("Accept all")',
	'button:has-text("Accept the use of cookies")',
	'button:has-text("同意する")',
	'button:has-text("すべて同意")',
]

const LIVE_SEARCH_LIMIT = 18
const SEARCH_PAGE_TIMEOUT_MS = 20000

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

const acceptYouTubeConsent = async (page: Page) => {
	for (const selector of consentSelectors) {
		const button = page.locator(selector).first()
		if (await button.isVisible({ timeout: 1500 }).catch(() => false)) {
			await button.click()
			return
		}
	}
}

/**
 * Accept YouTube consent and retry if the page is still on a consent URL.
 * Consolidates the repeated consent-retry pattern found across E2E helpers.
 */
export const acceptYouTubeConsentWithRetry = async (page: Page) => {
	await acceptYouTubeConsent(page)
	if (page.url().includes('consent')) {
		await page.waitForTimeout(TIMING.CONSENT_RETRY_DELAY_MS)
		await acceptYouTubeConsent(page)
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

type ChatStatus = 'playable' | 'unavailable' | 'not-live' | false

const checkLiveChatStatus = (): ChatStatus => {
	const h = window.__ylcHelpers
	if (!h.isLiveNow()) return 'not-live'
	const chatFrame = h.getNativeIframe()
	const doc = chatFrame?.contentDocument ?? null
	const href = doc?.location?.href ?? ''
	if (!doc || !href || href.includes('about:blank')) return false
	if (h.isDocUnavailable(doc)) return 'unavailable'
	if (h.isDocPlayable(doc)) return 'playable'
	return false
}

const isPlayableLiveCandidate = async (page: Page, url: string, deadline: number) => {
	const start = Date.now()
	if (start >= deadline) return false

	try {
		await page.goto(url, { waitUntil: 'domcontentloaded', timeout: Math.min(deadline - Date.now(), 15000) })
	} catch {
		return false
	}

	await acceptYouTubeConsent(page)

	if (Date.now() >= deadline) return false
	const hasPlayer = await page.waitForSelector('#movie_player', { state: 'attached', timeout: Math.min(deadline - Date.now(), 8000) }).then(
		() => true,
		() => false,
	)
	if (!hasPlayer) return false

	if (Date.now() >= deadline) return false
	const hasChatContainer = await page.waitForSelector('ytd-live-chat-frame', { state: 'attached', timeout: Math.min(deadline - Date.now(), 5000) }).then(
		() => true,
		() => false,
	)
	if (!hasChatContainer) {
		log(`candidate: no chat container (${((Date.now() - start) / 1000).toFixed(1)}s)`)
		return false
	}

	if (Date.now() >= deadline) return false
	const status = await page
		.waitForFunction(checkLiveChatStatus, { timeout: Math.min(deadline - Date.now(), 10000) })
		.then(handle => handle.jsonValue() as Promise<ChatStatus>)
		.catch(() => false as const)

	log(`candidate: ${status || 'timeout'} (${((Date.now() - start) / 1000).toFixed(1)}s)`)
	return status === 'playable'
}

export const findLiveUrlWithChat = async (page: Page, options: { limit?: number; searchUrls?: string[]; maxDurationMs?: number } = {}) => {
	const targets = getE2ETestTargets()
	const { limit = LIVE_SEARCH_LIMIT, searchUrls = targets.liveSearch.urls, maxDurationMs = 60000 } = options
	const start = Date.now()
	const deadline = start + maxDurationMs

	// 1. ワーカー間キャッシュ
	const cached = readSharedLiveUrl()
	if (cached) {
		log(`cache hit: ${cached}`)
		const cacheReady = await isPlayableLiveCandidate(page, cached, deadline)
		if (cacheReady) {
			log(`found: ${cached} (${((Date.now() - start) / 1000).toFixed(1)}s)`)
			return cached
		}
		log('cache stale, continuing search')
	} else {
		log('cache miss')
	}

	// 2. preferred URL
	if (targets.live.preferredUrl) {
		log(`preferred: ${targets.live.preferredUrl}`)
		const preferredReady = await isPlayableLiveCandidate(page, targets.live.preferredUrl, deadline)
		if (preferredReady) {
			writeSharedLiveUrl(targets.live.preferredUrl)
			log(`found: ${targets.live.preferredUrl} (${((Date.now() - start) / 1000).toFixed(1)}s)`)
			return targets.live.preferredUrl
		}
	}

	// 3. 検索ループ
	await addConsentCookies(page)
	const tried = new Set<string>()

	for (let i = 0; i < searchUrls.length; i++) {
		const searchUrl = searchUrls[i]
		if (Date.now() > deadline) break
		try {
			await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: Math.min(deadline - Date.now(), SEARCH_PAGE_TIMEOUT_MS) })
		} catch {
			continue
		}
		await acceptYouTubeConsentWithRetry(page)

		await page.waitForFunction(() => document.querySelectorAll('a#thumbnail').length > 0, { timeout: 15000 }).catch(() => null)
		const urls = await page.evaluate(collectVideoUrls)
		const candidates = urls.map(normalizeVideoUrl).filter(Boolean) as string[]
		log(`search ${i + 1}/${searchUrls.length}: ${candidates.length} candidates`)

		let inspected = 0
		for (const candidate of candidates) {
			if (Date.now() > deadline) break
			if (tried.has(candidate)) continue
			tried.add(candidate)
			inspected += 1
			if (inspected > limit) break

			const ready = await isPlayableLiveCandidate(page, candidate, deadline)
			if (ready) {
				writeSharedLiveUrl(candidate)
				log(`found: ${candidate} (${((Date.now() - start) / 1000).toFixed(1)}s)`)
				return candidate
			}
		}
	}

	log(`not found (${((Date.now() - start) / 1000).toFixed(1)}s)`)
	return null
}
