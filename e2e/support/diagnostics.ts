import type { Page, TestInfo } from '@playwright/test'
import { TIMING } from '@e2e/support/constants'
import { acceptYouTubeConsentWithRetry } from '@e2e/utils/liveUrl'
import { switchButtonSelector } from '@e2e/utils/selectors'

type DiagnosticState = {
	reason: string
	url: string
	mode: 'live' | 'archive' | 'unknown'
	fullscreen: boolean
	switchPressed: string | null
	native: {
		hasFrame: boolean
		href: string
		unavailable: boolean
		playable: boolean
	}
	extension: {
		hasFrame: boolean
		href: string
		owned: boolean
		unavailable: boolean
		playable: boolean
	}
}

const isBlankHref = (href: string | null | undefined) => !href || href.includes('about:blank')
// Keep this list consistent with `entrypoints/content/utils/nativeChat.ts`.
// `tp-yt-paper-icon-button` is intentionally excluded as a legacy renderer.
const archiveSidebarOpenSelectors = [
	'ytd-live-chat-frame #show-hide-button button',
	'ytd-live-chat-frame #show-hide-button yt-icon-button',
	'#chat-container #show-hide-button button',
	'#chat-container #show-hide-button yt-icon-button',
	'ytd-live-chat-frame #show-hide-button',
	'#chat-container #show-hide-button',
]

const archivePlayerChatToggleSelectors = [
	'.ytp-right-controls toggle-button-view-model button[aria-pressed="false"]',
	'.ytp-right-controls button-view-model button[aria-pressed="false"]',
	'#movie_player toggle-button-view-model button[aria-pressed="false"]',
	'#movie_player button-view-model button[aria-pressed="false"]',
]

const getChatDiagnosticState = ({ reason, switchSelector }: { reason: string; switchSelector: string }): DiagnosticState => {
	const h = window.__ylcHelpers
	const detectModeFromHref = (href: string): DiagnosticState['mode'] => {
		if (href.includes('/live_chat_replay')) return 'archive'
		if (href.includes('/live_chat')) return 'live'
		return 'unknown'
	}

	const switchButton = document.querySelector<HTMLButtonElement>(switchSelector)
	const nativeIframe = h.getNativeIframe()
	const extensionIframe = h.getExtensionIframe()

	const nativeDoc = nativeIframe?.contentDocument ?? null
	const nativeHref = h.readIframeHref(nativeIframe)
	const nativeUnavailable = h.isDocUnavailable(nativeDoc)

	const extensionDoc = extensionIframe?.contentDocument ?? null
	const extensionHref = h.readIframeHref(extensionIframe)
	const extensionUnavailable = h.isDocUnavailable(extensionDoc)

	const mode = detectModeFromHref(extensionHref || nativeHref)

	return {
		reason,
		url: window.location.href,
		mode,
		fullscreen: document.fullscreenElement !== null,
		switchPressed: switchButton?.getAttribute('aria-pressed') ?? null,
		native: {
			hasFrame: Boolean(nativeIframe),
			href: nativeHref,
			unavailable: nativeUnavailable,
			playable: Boolean(
				nativeHref &&
					!nativeHref.includes('about:blank') &&
					nativeHref.includes('/live_chat_replay') &&
					!nativeUnavailable &&
					h.isDocPlayable(nativeDoc),
			),
		},
		extension: {
			hasFrame: Boolean(extensionIframe),
			href: extensionHref,
			owned: Boolean(extensionIframe && extensionIframe.getAttribute('data-ylc-owned') === 'true'),
			unavailable: extensionUnavailable,
			playable: Boolean(extensionHref && !extensionHref.includes('about:blank') && !extensionUnavailable && h.isDocPlayable(extensionDoc)),
		},
	}
}

export const captureChatState = async (page: Page, testInfo: TestInfo, reason: string) => {
	try {
		const state = await page.evaluate(getChatDiagnosticState, { reason, switchSelector: switchButtonSelector })
		await testInfo.attach(`chat-diagnostics-${reason}`, {
			body: JSON.stringify(state, null, 2),
			contentType: 'application/json',
		})
		return state
	} catch {
		return null
	}
}

const timeoutFromRemaining = (remainingMs: number, maxMs: number) => Math.max(1000, Math.min(maxMs, remainingMs))

export const openArchiveWatchPage = async (page: Page, url: string, options: { maxDurationMs?: number } = {}) => {
	const { maxDurationMs = 30000 } = options
	const deadline = Date.now() + maxDurationMs
	const gotoTimeout = timeoutFromRemaining(deadline - Date.now(), 20000)

	try {
		await page.goto(url, { waitUntil: 'domcontentloaded', timeout: gotoTimeout })
		await acceptYouTubeConsentWithRetry(page)
	} catch {
		return false
	}

	const remainingBeforePlayerCheck = deadline - Date.now()
	if (remainingBeforePlayerCheck <= 0) return false
	const playerTimeout = timeoutFromRemaining(remainingBeforePlayerCheck, 10000)
	const hasPlayer = await page.waitForSelector('#movie_player', { state: 'attached', timeout: playerTimeout }).then(
		() => true,
		() => false,
	)
	if (!hasPlayer) return false

	const remainingBeforeFrameCheck = deadline - Date.now()
	if (remainingBeforeFrameCheck <= 0) return false
	const frameTimeout = timeoutFromRemaining(remainingBeforeFrameCheck, 10000)
	const hasNativeFrame = await page.waitForSelector('ytd-live-chat-frame', { state: 'attached', timeout: frameTimeout }).then(
		() => true,
		() => false,
	)
	return hasNativeFrame
}

export const shouldSkipArchiveFlowFailure = (state: DiagnosticState | null) => {
	if (!state) return false
	if (!state.native.hasFrame) return true
	if (state.native.unavailable) return true
	if (isBlankHref(state.native.href)) return true
	return false
}

export const isExtensionArchiveChatPlayable = () => {
	const h = window.__ylcHelpers
	const iframe = h.getExtensionIframe()
	if (!iframe) return false
	if (iframe.getAttribute('data-ylc-owned') === 'true') return false

	const doc = iframe.contentDocument ?? null
	const href = h.readIframeHref(iframe)
	if (!doc || !href || href.includes('about:blank')) return false

	if (doc.querySelector('yt-live-chat-unavailable-message-renderer')) return false
	const text = doc.body?.textContent ?? ''
	if (h.hasUnavailableText(text)) return false

	return Boolean(doc.querySelector('yt-live-chat-renderer') && doc.querySelector('yt-live-chat-item-list-renderer'))
}

export const isExtensionChatLoaded = () => {
	const h = window.__ylcHelpers
	const iframe = h.getExtensionIframe()
	if (!iframe) return false

	const href = h.readIframeHref(iframe)
	return Boolean(href && !href.includes('about:blank'))
}

const tryOpenArchiveNativeChatPanel = async (page: Page) => {
	return page
		.evaluate(
			({ sidebarSelectors, playerSelectors }) => {
				const h = window.__ylcHelpers

				const clickFirstMatching = (selectors: string[], options: { requireChatLabel?: boolean } = {}) => {
					for (const selector of selectors) {
						const targets = Array.from(document.querySelectorAll<HTMLElement>(selector))
						for (const target of targets) {
							const clickable = h.resolveClickable(target)
							if (!clickable) continue
							if (!h.isElementVisible(clickable)) continue
							if (clickable instanceof HTMLButtonElement && clickable.disabled) continue
							if (clickable.getAttribute('aria-disabled') === 'true') continue
							if (options.requireChatLabel) {
								const label = h.getButtonLabelText(clickable)
								if (!label.includes('chat') && !label.includes('チャット')) continue
							}
							clickable.click()
							return true
						}
					}
					return false
				}

				if (clickFirstMatching(sidebarSelectors)) return true

				const moviePlayer = document.getElementById('movie_player')
				if (moviePlayer) {
					for (const type of ['mouseover', 'mousemove', 'mouseenter'] as const) {
						moviePlayer.dispatchEvent(
							new MouseEvent(type, {
								bubbles: true,
								cancelable: true,
								composed: true,
							}),
						)
					}
				}

				if (clickFirstMatching(playerSelectors, { requireChatLabel: true })) return true

				const chatFrame = document.querySelector('ytd-live-chat-frame') as
					| (HTMLElement & { onShowHideChat?: () => void })
					| null
				if (typeof chatFrame?.onShowHideChat === 'function') {
					chatFrame.onShowHideChat()
					return true
				}

				return false
			},
			{ sidebarSelectors: archiveSidebarOpenSelectors, playerSelectors: archivePlayerChatToggleSelectors },
		)
		.catch(() => false)
}

export const ensureArchiveNativeChatPlayable = async (page: Page, options: { maxDurationMs?: number } = {}) => {
	const { maxDurationMs = 30000 } = options
	const deadline = Date.now() + maxDurationMs

	while (Date.now() < deadline) {
		const playable = await page.evaluate(isNativeArchivePlayable).catch(() => false)
		if (playable) return true
		await tryOpenArchiveNativeChatPanel(page)
		await page.waitForTimeout(TIMING.ARCHIVE_CHAT_OPEN_INTERVAL_MS)
	}

	return false
}

/**
 * Check if native chat iframe has playable chat (live or archive).
 * References `window.__ylcHelpers` injected via addInitScript.
 */
export const hasPlayableChat = () => {
	const h = window.__ylcHelpers
	const chatFrame = h.getNativeIframe()
	const doc = chatFrame?.contentDocument ?? null
	const href = doc?.location?.href ?? ''
	if (!doc || !href || href.includes('about:blank')) return false
	return h.isDocPlayable(doc)
}

/**
 * Check if native chat iframe has playable live chat (includes /live_chat href check).
 * References `window.__ylcHelpers` injected via addInitScript.
 */
export const isNativeLiveChatPlayable = () => {
	const h = window.__ylcHelpers
	const iframe = h.getNativeIframe()
	if (!iframe) return false

	const href = h.readIframeHref(iframe)
	const doc = iframe.contentDocument ?? null
	if (!doc || !href || href.includes('about:blank')) return false
	if (!href.includes('/live_chat')) return false
	return h.isDocPlayable(doc)
}

const isNativeArchivePlayable = () => {
	const h = window.__ylcHelpers
	const iframe = h.getNativeIframe()
	if (!iframe) return false

	const doc = iframe.contentDocument ?? null
	const href = h.readIframeHref(iframe)
	if (!doc || !href || href.includes('about:blank')) return false
	if (!href.includes('/live_chat_replay')) return false
	return h.isDocPlayable(doc)
}
