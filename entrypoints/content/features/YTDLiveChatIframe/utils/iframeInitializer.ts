import { chatBaseStylesheetProbe, queryAllProbes } from '@/entrypoints/content/platform/youtube/selectorCatalog'
import { IFRAME_STYLE_MARKER_ATTR } from '../constants/styleContract'

export const getIframeDocument = (iframe: HTMLIFrameElement) => {
  try {
    return iframe.contentDocument ?? null
  } catch {
    return null
  }
}

/** Keep an unstyled native document behind the loader; never reload its browsing context. */
export const ensureNativeChatStylesReady = (doc: Document, retried: WeakSet<HTMLLinkElement>) => {
  let ready = true
  for (const link of queryAllProbes<HTMLLinkElement>(doc, chatBaseStylesheetProbe).elements) {
    if (link.disabled || link.sheet?.disabled) continue
    try {
      if (link.sheet && link.sheet.cssRules.length > 0) continue
    } catch {
      // Cross-origin CSSOM is unreadable even when the stylesheet loaded normally.
      if (link.sheet) continue
    }
    ready = false
    if (doc.readyState !== 'complete' || retried.has(link)) continue
    const href = link.getAttribute('href')
    if (!href) continue
    try {
      if (new URL(href, doc.baseURI).origin !== doc.location?.origin) continue
    } catch {
      continue
    }
    retried.add(link)
    // Firefox can reuse an empty parsed sheet even after removing/restoring href.
    // A fragment changes its stylesheet-cache key, not the HTTP resource URL.
    // Keep it on this repaired document: reverting selects the cached empty sheet.
    link.setAttribute('href', `${href}${href.includes('#') ? '&' : '#'}ylc-css-retry`)
  }
  return ready
}

export const ensureStyleInjected = (doc: Document, cssText: string) => {
  const existing = doc.head?.querySelector(`style[${IFRAME_STYLE_MARKER_ATTR}="true"]`)
  if (existing) return false
  const style = doc.createElement('style')
  style.textContent = cssText
  style.setAttribute(IFRAME_STYLE_MARKER_ATTR, 'true')
  doc.head?.appendChild(style)
  return true
}
