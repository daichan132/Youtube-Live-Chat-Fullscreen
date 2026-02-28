export type YlcHelpers = {
	unavailableMarkers: string[]
	readIframeHref: (iframe: HTMLIFrameElement | null) => string
	getNativeIframe: () => HTMLIFrameElement | null
	getExtensionIframe: () => HTMLIFrameElement | null
	hasUnavailableText: (text: string) => boolean
	isDocUnavailable: (doc: Document | null) => boolean
	isDocPlayable: (doc: Document | null) => boolean
	resolveClickable: (target: HTMLElement) => HTMLElement | null
	isElementVisible: (element: HTMLElement) => boolean
	getButtonLabelText: (element: HTMLElement) => string
	isLiveNow: () => boolean
	isNativeChatUsable: () => boolean
}

declare global {
	interface Window {
		__ylcHelpers: YlcHelpers
	}
}

/**
 * Injected via `context.addInitScript()` so that every `page.evaluate` /
 * `page.waitForFunction` callback can reference `window.__ylcHelpers`
 * instead of re-declaring the same DOM helpers inline.
 */
export const PAGE_HELPERS_INIT_SCRIPT = () => {
	const unavailableMarkers = ['live chat replay is not available', 'chat is disabled', 'live chat is disabled']

	const readIframeHref = (iframe: HTMLIFrameElement | null): string => {
		if (!iframe) return ''
		try {
			const docHref = iframe.contentDocument?.location?.href ?? ''
			if (docHref) return docHref
		} catch {
			// Ignore CORS/DOM access errors and fall back to src.
		}
		return iframe.getAttribute('src') ?? iframe.src ?? ''
	}

	const getNativeIframe = () => {
		const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
		if (chatFrame) return chatFrame
		return document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame') as HTMLIFrameElement | null
	}

	const getExtensionIframe = () => {
		const host = document.getElementById('shadow-root-live-chat')
		const root = host?.shadowRoot ?? null
		return (root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null) ?? null
	}

	const hasUnavailableText = (text: string) => {
		const normalized = text.toLowerCase()
		return unavailableMarkers.some(marker => normalized.includes(marker))
	}

	const isDocUnavailable = (doc: Document | null) => {
		if (!doc) return false
		if (doc.querySelector('yt-live-chat-unavailable-message-renderer')) return true
		const text = doc.body?.textContent ?? ''
		return hasUnavailableText(text)
	}

	const isDocPlayable = (doc: Document | null) => {
		if (!doc) return false
		if (isDocUnavailable(doc)) return false
		return Boolean(doc.querySelector('yt-live-chat-renderer') && doc.querySelector('yt-live-chat-item-list-renderer'))
	}

	const resolveClickable = (target: HTMLElement) => {
		if (target.matches('button, yt-icon-button, [role="button"]')) return target
		return target.querySelector<HTMLElement>('button, yt-icon-button, [role="button"]')
	}

	const isElementVisible = (element: HTMLElement) => {
		if (element.hasAttribute('hidden')) return false
		if (element.getAttribute('aria-hidden') === 'true') return false
		const style = window.getComputedStyle(element)
		if (style.display === 'none' || style.visibility === 'hidden') return false
		return element.getClientRects().length > 0
	}

	const getButtonLabelText = (element: HTMLElement) =>
		`${element.getAttribute('aria-label') ?? ''} ${element.getAttribute('title') ?? ''} ${element.getAttribute('data-title-no-tooltip') ?? ''} ${element.getAttribute('data-tooltip-text') ?? ''}`.toLowerCase()

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
							liveBroadcastDetails?: { isLiveNow?: boolean }
						}
					}
					videoDetails?: { isLive?: boolean }
				}
			}
		).ytInitialPlayerResponse

		const liveBroadcastNow = response?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails?.isLiveNow
		if (typeof liveBroadcastNow === 'boolean') return liveBroadcastNow

		const videoDetailsLive = response?.videoDetails?.isLive
		if (typeof videoDetailsLive === 'boolean') return videoDetailsLive

		return false
	}

	const isNativeChatUsable = () => {
		const secondary = document.querySelector('#secondary') as HTMLElement | null
		const chatContainer = document.querySelector('#chat-container') as HTMLElement | null
		const chatFrameHost = document.querySelector('ytd-live-chat-frame') as HTMLElement | null
		const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
		if (!secondary || !chatContainer || !chatFrameHost || !chatFrame) return false

		const secondaryStyle = window.getComputedStyle(secondary)
		const containerStyle = window.getComputedStyle(chatContainer)
		const hostStyle = window.getComputedStyle(chatFrameHost)
		const isHidden =
			secondaryStyle.display === 'none' ||
			secondaryStyle.visibility === 'hidden' ||
			containerStyle.display === 'none' ||
			containerStyle.visibility === 'hidden' ||
			hostStyle.display === 'none' ||
			hostStyle.visibility === 'hidden'
		if (isHidden) return false

		const pointerBlocked =
			secondaryStyle.pointerEvents === 'none' || containerStyle.pointerEvents === 'none' || hostStyle.pointerEvents === 'none'
		if (pointerBlocked) return false

		const secondaryBox = secondary.getBoundingClientRect()
		const chatBox = chatFrameHost.getBoundingClientRect()
		const frameBox = chatFrame.getBoundingClientRect()
		return secondaryBox.width > 80 && chatBox.width > 80 && chatBox.height > 120 && frameBox.height > 120
	}

	window.__ylcHelpers = {
		unavailableMarkers,
		readIframeHref,
		getNativeIframe,
		getExtensionIframe,
		hasUnavailableText,
		isDocUnavailable,
		isDocPlayable,
		resolveClickable,
		isElementVisible,
		getButtonLabelText,
		isLiveNow,
		isNativeChatUsable,
	}
}
