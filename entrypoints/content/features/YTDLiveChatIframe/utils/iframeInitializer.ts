import { getNonBlankIframeHref } from '@/entrypoints/content/chat/shared/iframeDom'
import { IFRAME_CHAT_BODY_CLASS, IFRAME_STYLE_MARKER_ATTR } from '../constants/styleContract'

type IframeInitializerOptions = {
  iframeStyles: string
  applyChatStyle: () => void
  setIsIframeLoaded: (value: boolean) => void
  setIsDisplay: (value: boolean) => void
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
    if (!doc?.head || !doc.body) return false

    // Reject about:blank — a newly-created managed iframe starts with a blank
    // same-origin document that will be replaced once navigation completes.
    // Injecting styles here would be discarded and cause a flash of unstyled content.
    try {
      if (doc.location?.href === 'about:blank') return false
    } catch {
      // cross-origin doc.location access throws — the document is real, not blank.
    }

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
        clearRetry()
        return
      }

      if (retryAttempts >= retryMaxAttempts) {
        setIsIframeLoaded(true)
        clearRetry()
      }
    }, retryIntervalMs)
  }

  const initialize = (iframe: HTMLIFrameElement) => {
    const initialized = tryInitializeStyle(iframe)
    if (initialized) {
      clearRetry()
      return true
    }

    const href = getNonBlankIframeHref(iframe)
    if (!href) return false

    // Fail-open: if iframe URL is valid but document access is temporarily blocked,
    // keep iframe in DOM and retry style injection. Loading overlay stays visible
    // until styles are applied (or retries exhaust as a fallback).
    setIsDisplay(true)
    startRetry(iframe)
    return false
  }

  return {
    initialize,
    cleanup: clearRetry,
  }
}
