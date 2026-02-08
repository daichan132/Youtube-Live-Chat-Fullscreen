import type { Page } from '@playwright/test'
import { switchButtonSelector as defaultSwitchButtonSelector } from './selectors'

type ChatDiagnosticsOptions = {
  switchSelector?: string
}

type WaitForChatStateOptions = ChatDiagnosticsOptions & {
  timeoutMs?: number
  intervalMs?: number
}

type ChatSwitchState = {
  exists: boolean
  visible: boolean
  pressed: boolean | null
}

type NativeChatState = {
  hasHost: boolean
  hasFrame: boolean
  href: string
  sourceResolved: boolean
  playable: boolean
  unavailable: boolean
  open: boolean
  closed: boolean
}

type ExtensionIframeState = {
  hasHost: boolean
  hasIframe: boolean
  borrowed: boolean
  src: string
  href: string
  loaded: boolean
  playable: boolean
}

export type ChatDiagnosticsState = {
  url: string
  fullscreen: boolean
  switch: ChatSwitchState
  native: NativeChatState
  iframe: ExtensionIframeState
}

const browserCollectChatDiagnostics = (switchSelector: string): ChatDiagnosticsState => {
  const chatUnavailablePatterns = ['live chat replay is not available', 'chat is disabled', 'live chat is disabled']

  const isVisible = (element: Element | null): boolean => {
    if (!(element instanceof HTMLElement)) return false
    if (element.hidden) return false
    const style = window.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }

  const getIframeDocument = (iframe: HTMLIFrameElement | null) => {
    if (!iframe) return null
    try {
      return iframe.contentDocument ?? null
    } catch {
      return null
    }
  }

  const getIframeHref = (iframe: HTMLIFrameElement | null) => {
    if (!iframe) return ''
    try {
      const docHref = iframe.contentDocument?.location?.href
      if (docHref) return docHref
    } catch {
      // Ignore access errors and use iframe src fallback.
    }
    return iframe.getAttribute('src') ?? iframe.src ?? ''
  }

  const isUnavailableDocument = (doc: Document | null) => {
    if (!doc) return false
    if (doc.querySelector('yt-live-chat-unavailable-message-renderer')) return true
    const text = doc.body?.textContent?.toLowerCase() ?? ''
    if (!text) return false
    return chatUnavailablePatterns.some(pattern => text.includes(pattern))
  }

  const isPlayableDocument = (doc: Document | null, href: string) => {
    if (!doc || !href || href.includes('about:blank')) return false
    if (isUnavailableDocument(doc)) return false
    return Boolean(doc.querySelector('yt-live-chat-renderer') && doc.querySelector('yt-live-chat-item-list-renderer'))
  }

  const switchButton = document.querySelector<HTMLButtonElement>(switchSelector)
  const nativeHost = document.querySelector('ytd-live-chat-frame') as HTMLElement | null
  const nativeContainer = document.querySelector('#chat-container') as HTMLElement | null
  const nativeFrame = (document.querySelector('#chatframe') ??
    document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame')) as HTMLIFrameElement | null
  const nativeDoc = getIframeDocument(nativeFrame)
  const nativeHref = getIframeHref(nativeFrame)

  const showHideButton = document.querySelector('ytd-live-chat-frame #show-hide-button, #chat-container #show-hide-button')
  const closeButton = document.querySelector('ytd-live-chat-frame #close-button, #chat-container #close-button')
  const containerStyle = nativeContainer ? window.getComputedStyle(nativeContainer) : null
  const hostStyle = nativeHost ? window.getComputedStyle(nativeHost) : null
  const hiddenByStyle =
    containerStyle?.display === 'none' ||
    containerStyle?.visibility === 'hidden' ||
    hostStyle?.display === 'none' ||
    hostStyle?.visibility === 'hidden'
  const hiddenByAttribute =
    Boolean(nativeContainer?.hasAttribute('hidden') || nativeHost?.hasAttribute('hidden')) ||
    nativeContainer?.getAttribute('aria-hidden') === 'true' ||
    nativeHost?.getAttribute('aria-hidden') === 'true'
  const nativeSourceResolved = Boolean(nativeHref && !nativeHref.includes('about:blank'))
  const nativeOpen = Boolean(nativeContainer && nativeHost && nativeFrame && nativeSourceResolved && !hiddenByStyle && !hiddenByAttribute)
  const nativeClosed = Boolean(!nativeOpen || (showHideButton && !closeButton))

  const extensionHost = document.getElementById('shadow-root-live-chat')
  const extensionRoot = extensionHost?.shadowRoot ?? null
  const extensionIframe = extensionRoot?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  const extensionDoc = getIframeDocument(extensionIframe)
  const extensionSrc = extensionIframe ? extensionIframe.getAttribute('src') ?? extensionIframe.src ?? '' : ''
  const extensionHref = getIframeHref(extensionIframe)

  return {
    url: window.location.href,
    fullscreen: document.fullscreenElement !== null,
    switch: {
      exists: Boolean(switchButton),
      visible: isVisible(switchButton),
      pressed: switchButton ? switchButton.getAttribute('aria-pressed') === 'true' : null,
    },
    native: {
      hasHost: Boolean(nativeHost),
      hasFrame: Boolean(nativeFrame),
      href: nativeHref,
      sourceResolved: nativeSourceResolved,
      playable: isPlayableDocument(nativeDoc, nativeHref),
      unavailable: isUnavailableDocument(nativeDoc),
      open: nativeOpen,
      closed: nativeClosed,
    },
    iframe: {
      hasHost: Boolean(extensionHost),
      hasIframe: Boolean(extensionIframe),
      borrowed: Boolean(extensionIframe && extensionIframe.getAttribute('data-ylc-owned') !== 'true'),
      src: extensionSrc,
      href: extensionHref,
      loaded: Boolean(extensionDoc && extensionDoc.readyState === 'complete'),
      playable: isPlayableDocument(extensionDoc, extensionHref),
    },
  }
}

export const getChatDiagnostics = async (
  page: Page,
  options: ChatDiagnosticsOptions = {},
): Promise<ChatDiagnosticsState> => {
  const { switchSelector = defaultSwitchButtonSelector } = options
  return page.evaluate(browserCollectChatDiagnostics, switchSelector)
}

export const logChatDiagnostics = async (
  page: Page,
  label: string,
  options: ChatDiagnosticsOptions = {},
): Promise<ChatDiagnosticsState> => {
  const state = await getChatDiagnostics(page, options)
  // eslint-disable-next-line no-console
  console.log(`[e2e][${label}]`, state)
  return state
}

export const waitForChatState = async (
  page: Page,
  predicate: (state: ChatDiagnosticsState) => boolean,
  options: WaitForChatStateOptions = {},
) => {
  const { timeoutMs = 20000, intervalMs = 500, switchSelector = defaultSwitchButtonSelector } = options
  const deadline = Date.now() + timeoutMs
  let latestState = await getChatDiagnostics(page, { switchSelector })

  while (Date.now() < deadline) {
    if (predicate(latestState)) return { ok: true as const, state: latestState }
    await page.waitForTimeout(intervalMs)
    latestState = await getChatDiagnostics(page, { switchSelector })
  }

  return { ok: false as const, state: latestState }
}

export const waitForNativeArchiveReplayPlayable = async (page: Page, options: WaitForChatStateOptions = {}) => {
  const { timeoutMs = 90000, intervalMs = 1000, switchSelector } = options
  return waitForChatState(page, state => state.fullscreen && state.native.playable && !state.native.open, {
    timeoutMs,
    intervalMs,
    switchSelector,
  })
}

export const waitForNativeSourceResolved = async (page: Page, options: WaitForChatStateOptions = {}) => {
  const { timeoutMs = 15000, intervalMs = 500, switchSelector } = options
  return waitForChatState(page, state => state.native.sourceResolved, {
    timeoutMs,
    intervalMs,
    switchSelector,
  })
}

export const waitForNativeReplayUnavailable = async (page: Page, options: WaitForChatStateOptions = {}) => {
  const { timeoutMs = 30000, intervalMs = 500, switchSelector } = options
  return waitForChatState(page, state => state.native.unavailable, {
    timeoutMs,
    intervalMs,
    switchSelector,
  })
}
