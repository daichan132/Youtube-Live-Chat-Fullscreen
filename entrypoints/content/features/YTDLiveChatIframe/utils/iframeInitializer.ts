import type { IframeLoadState } from '@/entrypoints/content/chat/runtime/types'
import { IFRAME_CHAT_BODY_CLASS, IFRAME_STYLE_MARKER_ATTR } from '../constants/styleContract'
import { getNonBlankIframeHref } from './iframeAttachment'

type IframeInitializerOptions = {
  iframeStyles: string
  applyChatStyle: () => void
  setIsIframeLoaded: (value: boolean) => void
  setIsDisplay: (value: boolean) => void
  setLoadState: (state: IframeLoadState) => void
  debugLog?: (message: string, details?: Record<string, unknown>) => void
  retryIntervalMs?: number
  retryMaxAttempts?: number
}

const getIframeDocument = (iframe: HTMLIFrameElement) => {
  try {
    return iframe.contentDocument ?? null
  } catch {
    return null
  }
}

const ensureStyleInjected = (doc: Document, cssText: string) => {
  const existing = doc.head?.querySelector(`style[${IFRAME_STYLE_MARKER_ATTR}="true"]`)
  if (existing) return false
  const style = doc.createElement('style')
  style.textContent = cssText
  style.setAttribute(IFRAME_STYLE_MARKER_ATTR, 'true')
  doc.head?.appendChild(style)
  return true
}

export const createIframeInitializer = ({
  iframeStyles,
  applyChatStyle,
  setIsIframeLoaded,
  setIsDisplay,
  setLoadState,
  debugLog,
  retryIntervalMs = 1000,
  retryMaxAttempts = 10,
}: IframeInitializerOptions) => {
  let retryInterval: number | null = null
  let retryAttempts = 0
  let retryIframe: HTMLIFrameElement | null = null

  const clearRetry = () => {
    if (retryInterval) {
      window.clearInterval(retryInterval)
      retryInterval = null
    }
    retryAttempts = 0
    retryIframe = null
  }

  const tryInitializeStyle = (iframe: HTMLIFrameElement) => {
    const doc = getIframeDocument(iframe)
    if (!doc || !doc.head || !doc.body) return false

    const styleInjected = ensureStyleInjected(doc, iframeStyles)
    const classAdded = !doc.body.classList.contains(IFRAME_CHAT_BODY_CLASS)
    if (classAdded) {
      doc.body.classList.add(IFRAME_CHAT_BODY_CLASS)
    }

    if (styleInjected || classAdded) {
      applyChatStyle()
    }

    setIsIframeLoaded(true)
    setIsDisplay(true)
    setLoadState('ready')
    return true
  }

  const startRetry = (iframe: HTMLIFrameElement) => {
    if (retryInterval && retryIframe === iframe) return
    clearRetry()
    retryIframe = iframe
    retryInterval = window.setInterval(() => {
      if (!retryIframe) {
        clearRetry()
        return
      }

      retryAttempts += 1
      const initialized = tryInitializeStyle(retryIframe)
      if (initialized) {
        debugLog?.('initializer retry succeeded', {
          attempts: retryAttempts,
          href: getNonBlankIframeHref(retryIframe),
        })
        clearRetry()
        return
      }

      if (retryAttempts >= retryMaxAttempts) {
        debugLog?.('initializer retry exhausted', {
          attempts: retryAttempts,
          href: getNonBlankIframeHref(retryIframe),
        })
        clearRetry()
      }
    }, retryIntervalMs)
  }

  const initialize = (iframe: HTMLIFrameElement) => {
    setLoadState('initializing')
    const initialized = tryInitializeStyle(iframe)
    if (initialized) {
      clearRetry()
      return true
    }

    const href = getNonBlankIframeHref(iframe)
    if (!href) return false

    // Fail-open: if iframe URL is valid but document access is temporarily blocked,
    // allow visibility and keep retrying style injection.
    setIsIframeLoaded(true)
    setIsDisplay(true)
    setLoadState('ready')
    startRetry(iframe)
    return false
  }

  return {
    initialize,
    cleanup: clearRetry,
  }
}
