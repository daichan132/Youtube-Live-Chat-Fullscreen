import { collapsedPinnedMessageContentProbe, queryAllProbes } from '../platform/youtube/selectorCatalog'

/** Chromium can retain the old ellipsis paint after its block's color changes. */
export const refreshPinnedMessageEllipsis = (document: Document) => {
  const { elements } = queryAllProbes<HTMLElement>(document, collapsedPinnedMessageContentProbe)
  for (const element of elements) {
    const value = element.style.getPropertyValue('text-overflow')
    const priority = element.style.getPropertyPriority('text-overflow')
    const hadStyleAttribute = element.hasAttribute('style')
    try {
      // Rebuild only this truncation marker, synchronously before the next
      // paint. Do not resize the panel or change message text / child colors.
      element.style.setProperty('text-overflow', 'clip', 'important')
      void element.offsetWidth
    } finally {
      if (value) element.style.setProperty('text-overflow', value, priority)
      else element.style.removeProperty('text-overflow')
      if (!hadStyleAttribute && element.style.length === 0) element.removeAttribute('style')
    }
  }
}
