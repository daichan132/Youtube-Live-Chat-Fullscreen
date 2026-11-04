import { IFRAME_CHAT_ONLY_CLASS } from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import {
  chatChromeHeaderSelector,
  chatChromeInputFallbackTags,
  chatChromeInputPanelId,
} from '@/entrypoints/content/platform/youtube/selectorCatalog'

export const isChromeElement = (element: Element) => {
  const tag = element.localName
  return tag === chatChromeHeaderSelector || element.id === chatChromeInputPanelId || chatChromeInputFallbackTags.includes(tag)
}

export const hasNativeVisibleAncestry = (element: HTMLElement, body: HTMLElement, layoutOnly = false) => {
  if (!body.contains(element)) return false
  for (let candidate: HTMLElement | null = element; candidate; candidate = candidate.parentElement) {
    if (candidate.hidden || candidate.getAttribute('aria-hidden') === 'true' || candidate.hasAttribute('inert')) return false
    const style = candidate.ownerDocument.defaultView?.getComputedStyle(candidate)
    if (style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse') return false
    // Our own collapsed input must be allowed to reopen. Native hidden offer
    // nodes, including retained nodes with opacity:0, must not keep it expanded.
    if (style?.opacity === '0' && !layoutOnly && !(isChromeElement(candidate) && body.classList.contains(IFRAME_CHAT_ONLY_CLASS)))
      return false
    if (candidate === body) break
  }
  return true
}
