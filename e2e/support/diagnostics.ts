import type { Page, TestInfo } from '@playwright/test'
import { acceptYouTubeConsent } from '../utils/liveUrl'
import { switchButtonSelector } from '../utils/selectors'

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

const readIframeHref = (iframe: HTMLIFrameElement | null) => {
  if (!iframe) return ''
  try {
    const docHref = iframe.contentDocument?.location?.href ?? ''
    if (docHref) return docHref
  } catch {
    // Ignore CORS/DOM access errors and fall back to src.
  }
  return iframe.getAttribute('src') ?? iframe.src ?? ''
}

const unavailableMarkers = ['live chat replay is not available', 'chat is disabled', 'live chat is disabled']

const getTextUnavailable = (text: string) => {
  const normalized = text.toLowerCase()
  return unavailableMarkers.some(marker => normalized.includes(marker))
}

const isDocUnavailable = (doc: Document | null) => {
  if (!doc) return false
  if (doc.querySelector('yt-live-chat-unavailable-message-renderer')) return true
  const text = doc.body?.textContent ?? ''
  return getTextUnavailable(text)
}

const isDocPlayable = (doc: Document | null) => {
  if (!doc) return false
  if (isDocUnavailable(doc)) return false
  return Boolean(doc.querySelector('yt-live-chat-renderer') && doc.querySelector('yt-live-chat-item-list-renderer'))
}

const detectModeFromHref = (href: string): DiagnosticState['mode'] => {
  if (href.includes('/live_chat_replay')) return 'archive'
  if (href.includes('/live_chat')) return 'live'
  return 'unknown'
}

export const getChatDiagnosticState = ({ reason, switchSelector }: { reason: string; switchSelector: string }): DiagnosticState => {
  const getNativeIframe = () => {
    const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
    if (chatFrame) return chatFrame
    return document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame') as HTMLIFrameElement | null
  }

  const getExtensionIframe = () => {
    const host = document.getElementById('shadow-root-live-chat')
    const root = host?.shadowRoot ?? null
    return root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  }

  const switchButton = document.querySelector<HTMLButtonElement>(switchSelector)
  const nativeIframe = getNativeIframe()
  const extensionIframe = getExtensionIframe()

  const nativeDoc = nativeIframe?.contentDocument ?? null
  const nativeHref = readIframeHref(nativeIframe)
  const nativeUnavailable = isDocUnavailable(nativeDoc)

  const extensionDoc = extensionIframe?.contentDocument ?? null
  const extensionHref = readIframeHref(extensionIframe)
  const extensionUnavailable = isDocUnavailable(extensionDoc)

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
          isDocPlayable(nativeDoc),
      ),
    },
    extension: {
      hasFrame: Boolean(extensionIframe),
      href: extensionHref,
      owned: Boolean(extensionIframe && extensionIframe.getAttribute('data-ylc-owned') === 'true'),
      unavailable: extensionUnavailable,
      playable: Boolean(extensionHref && !extensionHref.includes('about:blank') && !extensionUnavailable && isDocPlayable(extensionDoc)),
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

const gotoAndPrepareWatchPage = async (page: Page, url: string, timeout: number) => {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout })
  await acceptYouTubeConsent(page)
  if (page.url().includes('consent')) {
    await page.waitForTimeout(1000)
    await acceptYouTubeConsent(page)
  }
}

const timeoutFromRemaining = (remainingMs: number, maxMs: number) => Math.max(1000, Math.min(maxMs, remainingMs))

export const openArchiveWatchPage = async (page: Page, url: string, options: { maxDurationMs?: number } = {}) => {
  const { maxDurationMs = 30000 } = options
  const deadline = Date.now() + maxDurationMs
  const gotoTimeout = timeoutFromRemaining(deadline - Date.now(), 20000)

  try {
    await gotoAndPrepareWatchPage(page, url, gotoTimeout)
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
  if (!state) return true
  if (!state.native.hasFrame) return true
  if (state.native.unavailable) return true
  if (isBlankHref(state.native.href)) return true
  return false
}

export const isNativeReplayUnavailable = () => {
  const getNativeIframe = () => {
    const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
    if (chatFrame) return chatFrame
    return document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame') as HTMLIFrameElement | null
  }

  const iframe = getNativeIframe()
  const doc = iframe?.contentDocument ?? null
  const href = readIframeHref(iframe)
  if (!doc || !href || href.includes('about:blank')) return false

  if (doc.querySelector('yt-live-chat-unavailable-message-renderer')) return true
  const text = doc.body?.textContent ?? ''
  return getTextUnavailable(text)
}

export const isExtensionArchiveChatPlayable = () => {
  const getExtensionIframe = () => {
    const host = document.getElementById('shadow-root-live-chat')
    const root = host?.shadowRoot ?? null
    return root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  }

  const iframe = getExtensionIframe()
  if (!iframe) return false
  if (iframe.getAttribute('data-ylc-owned') === 'true') return false

  const doc = iframe.contentDocument ?? null
  const href = readIframeHref(iframe)
  if (!doc || !href || href.includes('about:blank')) return false

  if (doc.querySelector('yt-live-chat-unavailable-message-renderer')) return false
  const text = doc.body?.textContent ?? ''
  if (getTextUnavailable(text)) return false

  return Boolean(doc.querySelector('yt-live-chat-renderer') && doc.querySelector('yt-live-chat-item-list-renderer'))
}

export const isExtensionChatLoaded = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return false

  const href = readIframeHref(iframe)
  return Boolean(href && !href.includes('about:blank'))
}
