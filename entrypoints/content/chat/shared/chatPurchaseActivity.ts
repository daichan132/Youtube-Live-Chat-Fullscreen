import {
  chatPurchaseInputProbe,
  chatPurchaseLoadingProbe,
  chatPurchasePanelProbe,
  queryAllProbes,
} from '@/entrypoints/content/platform/youtube/selectorCatalog'
import { hasNativeVisibleAncestry } from './chatChromeVisibility'
import { isAccessibleNode } from './isAccessibleNode'

const PURCHASE_BOUNDARY_SELECTOR = [
  ...chatPurchaseInputProbe.selectors,
  ...chatPurchasePanelProbe.selectors,
  ...chatPurchaseLoadingProbe.selectors,
].join(', ')
const PURCHASE_STATE_ATTRIBUTES = [
  'product-picker-open',
  'live-chat',
  'hidden',
  'aria-hidden',
  'inert',
  'style',
  'class',
  'selected',
  'aria-selected',
]

const isRenderedPurchasePanel = (element: HTMLElement, body: HTMLElement) => {
  if (!hasNativeVisibleAncestry(element, body)) return false
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

/** Inspect native state only; this never activates a paid action or changes focus. */
export const hasOpenChatPurchaseUI = (body: HTMLElement, previouslyOpen = false) => {
  const inputs = queryAllProbes<HTMLElement>(body, chatPurchaseInputProbe).elements
  if (inputs.some(input => input.hasAttribute('product-picker-open') && hasNativeVisibleAncestry(input, body))) return true
  const panels = queryAllProbes<HTMLElement>(body, chatPurchasePanelProbe).elements
  if (panels.some(panel => isRenderedPurchasePanel(panel, body))) return true
  // A native offer may be replaced by a spinner between steps. Only continue
  // an already-open purchase; initial chat loading is not a purchase state.
  return (
    previouslyOpen &&
    queryAllProbes<HTMLElement>(body, chatPurchaseLoadingProbe).elements.some(panel => isRenderedPurchasePanel(panel, body))
  )
}

// Observe a known tag even when an attribute-qualified probe stops matching.
// Removing live-chat or hiding the donation root must release the old hold.
const PURCHASE_BOUNDARY_TAGS = new Set<string>(
  [...chatPurchaseInputProbe.selectors, ...chatPurchasePanelProbe.selectors].flatMap(
    selector => selector.match(/^[a-z][a-z0-9-]*/)?.[0] ?? [],
  ),
)
const isPurchaseBoundaryElement = (element: Element) =>
  PURCHASE_BOUNDARY_TAGS.has(element.localName) || (element.id === 'loading' && element.matches(chatPurchaseLoadingProbe.selectors[0]))

const touchesPurchaseBoundary = (node: Node) => {
  if (node.nodeType !== Node.ELEMENT_NODE) return false
  const element = node as Element
  if (isPurchaseBoundaryElement(element)) return true
  // Chat bursts are not purchase transitions. Avoid selector engines for both
  // text-only additions and ordinary message subtrees, including paid messages.
  if (!element.childElementCount || (element.localName.startsWith('yt-live-chat-') && element.localName.endsWith('-message-renderer'))) {
    return false
  }
  return element.querySelector(PURCHASE_BOUNDARY_SELECTOR) !== null
}

const mutationMayChangePurchaseUI = (mutation: MutationRecord) => {
  const target = mutation.target.nodeType === Node.ELEMENT_NODE ? (mutation.target as Element) : mutation.target.parentElement
  for (let candidate = target; candidate; candidate = candidate.parentElement) {
    if (isPurchaseBoundaryElement(candidate)) return true
  }
  if (mutation.type === 'attributes') return target ? touchesPurchaseBoundary(target) : false
  return [...mutation.addedNodes, ...mutation.removedNodes].some(touchesPurchaseBoundary)
}

/** Observe only native purchase presentation, emitting the initial state and changes. */
export const observeChatPurchaseUI = (body: HTMLElement, onChange: (open: boolean) => void, previouslyOpen = false) => {
  let open = hasOpenChatPurchaseUI(body, previouslyOpen)
  const refresh = () => {
    if (!isAccessibleNode(body)) return
    const nextOpen = hasOpenChatPurchaseUI(body, open)
    if (nextOpen === open) return
    open = nextOpen
    onChange(open)
  }
  const observer = new MutationObserver(mutations => {
    if (mutations.some(mutationMayChangePurchaseUI)) refresh()
  })
  const onTransitionEnd = (event: Event) => {
    if (event.target && touchesPurchaseBoundary(event.target as Node)) refresh()
  }
  // Establish the initial presentation before observing our callback's own
  // body classes and measurement writes as if they were native UI changes.
  onChange(open)
  observer.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: PURCHASE_STATE_ATTRIBUTES })
  body.addEventListener('transitionend', onTransitionEnd)
  body.addEventListener('animationend', onTransitionEnd)
  return () => {
    observer.disconnect()
    if (!isAccessibleNode(body)) return
    body.removeEventListener('transitionend', onTransitionEnd)
    body.removeEventListener('animationend', onTransitionEnd)
  }
}
