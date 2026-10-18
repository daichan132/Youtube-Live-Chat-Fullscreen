import {
  IFRAME_CHAT_ONLY_BOTTOM_PADDING_VAR,
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_MEASURING_CLASS,
  IFRAME_CHAT_ONLY_MODE_CLASS,
  IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_TOP_PADDING_VAR,
  IFRAME_CHAT_ONLY_TRANSITION_CLASS,
  IFRAME_PURCHASE_ACTIVE_CLASS,
} from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'

import {
  chatPurchaseInputProbe,
  chatPurchaseLoadingProbe,
  chatPurchasePanelProbe,
  queryAllProbes,
} from '@/entrypoints/content/platform/youtube/selectorCatalog'
import { preserveChatScroll } from './ChatScrollAnchor'
import { isAccessibleNode } from './isAccessibleNode'

export type ChatOnlyChromeIntent = 'inactive' | 'hold' | 'expanded' | 'collapsed'

const HEADER_SELECTOR = 'yt-live-chat-header-renderer'
const INPUT_PANEL_SELECTOR = '#input-panel'
const INPUT_FALLBACK_TAGS: readonly string[] = [
  'yt-live-chat-message-input-renderer',
  'yt-live-chat-restricted-participation-renderer',
  'yt-live-chat-sign-in-prompt-renderer',
]
const INPUT_FALLBACK_SELECTOR = INPUT_FALLBACK_TAGS.join(', ')
const CHROME_SELECTOR = `${HEADER_SELECTOR}, ${INPUT_PANEL_SELECTOR}, ${INPUT_FALLBACK_SELECTOR}`
const TRANSITION_FALLBACK_MS = 310

const getBody = (iframe: HTMLIFrameElement | null) => {
  try {
    return iframe?.contentDocument?.body ?? null
  } catch {
    return null
  }
}

const resolveOutermostFallbacks = (body: HTMLElement) =>
  [...body.querySelectorAll<HTMLElement>(INPUT_FALLBACK_SELECTOR)].filter(
    candidate => !candidate.parentElement?.closest(INPUT_FALLBACK_SELECTOR),
  )

export const resolveChatOnlyChromeElements = (body: HTMLElement) => {
  const header = body.querySelector<HTMLElement>(HEADER_SELECTOR)
  const inputPanel = body.querySelector<HTMLElement>(INPUT_PANEL_SELECTOR)
  return [header, ...(inputPanel ? [inputPanel] : resolveOutermostFallbacks(body))].filter(
    (element): element is HTMLElement => element !== null,
  )
}

const clearMeasurements = (elements: HTMLElement[]) => {
  for (const element of elements) {
    if (isAccessibleNode(element)) element.style.removeProperty(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)
  }
}

const measure = (elements: HTMLElement[]) => {
  clearMeasurements(elements)
  let top = 12
  let bottom = 12
  for (const element of elements) {
    const height = Math.max(0, Math.ceil(element.getBoundingClientRect().height))
    element.style.setProperty(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR, `${height}px`)
    if (height > 0) {
      if (element.localName === HEADER_SELECTOR) top = 0
      else bottom = 0
    }
  }
  return { top, bottom }
}

const sameElements = (left: HTMLElement[], right: HTMLElement[]) =>
  left.length === right.length && left.every((element, index) => element === right[index])

const isChromeElement = (element: Element) => {
  const tag = element.localName
  return tag === HEADER_SELECTOR || element.id === 'input-panel' || INPUT_FALLBACK_TAGS.includes(tag)
}

const mutationMayChangeChrome = (mutation: MutationRecord, elements: HTMLElement[]) => {
  if (elements.some(element => element === mutation.target || element.contains(mutation.target))) return true
  for (const node of mutation.removedNodes) {
    if (elements.some(element => node === element || node.contains(element))) return true
  }
  for (const node of mutation.addedNodes) {
    if (node.nodeType !== Node.ELEMENT_NODE) continue
    // Added nodes belong to the iframe's realm, so a parent-window
    // `instanceof Element` check would miss newly mounted chrome.
    const element = node as Element
    if (isChromeElement(element) || (element.childElementCount > 0 && element.querySelector(CHROME_SELECTOR))) return true
  }
  return false
}

const PURCHASE_BOUNDARY_SELECTOR = [
  ...chatPurchaseInputProbe.selectors,
  ...chatPurchasePanelProbe.selectors,
  ...chatPurchaseLoadingProbe.selectors,
].join(', ')
const PURCHASE_STATE_ATTRIBUTES = ['product-picker-open', 'hidden', 'aria-hidden', 'inert', 'style', 'class', 'selected', 'aria-selected']

const hasNativeVisibleAncestry = (element: HTMLElement, body: HTMLElement) => {
  if (!body.contains(element)) return false
  for (let candidate: HTMLElement | null = element; candidate; candidate = candidate.parentElement) {
    if (candidate.hidden || candidate.getAttribute('aria-hidden') === 'true' || candidate.hasAttribute('inert')) return false
    const style = candidate.ownerDocument.defaultView?.getComputedStyle(candidate)
    if (style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse') return false
    // Our own collapsed input must be allowed to reopen. Native hidden offer
    // nodes, including retained nodes with opacity:0, must not keep it expanded.
    if (style?.opacity === '0' && !(body.classList.contains(IFRAME_CHAT_ONLY_CLASS) && isChromeElement(candidate))) return false
    if (candidate === body) break
  }
  return true
}

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

const PURCHASE_BOUNDARY_TAGS = new Set<string>([...chatPurchaseInputProbe.selectors, ...chatPurchasePanelProbe.selectors])
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

const blurActiveElement = (body: HTMLElement) => {
  const active = body.ownerDocument.activeElement
  if (active && 'blur' in active && typeof active.blur === 'function') active.blur()
}

export type ChatChromeLease = {
  sync(iframe: HTMLIFrameElement | null, intent: ChatOnlyChromeIntent): void
  release(): void
}

export const createChatChromeLease = (): ChatChromeLease => {
  let iframe: HTMLIFrameElement | null = null
  let chatDocument: Document | null = null
  let body: HTMLElement | null = null
  let elements: HTMLElement[] = []
  let settleTimer: number | null = null
  let targetObserver: MutationObserver | null = null
  let documentObserver: MutationObserver | null = null
  let stopPurchaseObserver: (() => void) | null = null
  let purchaseOpen = false
  let requestedIntent: ChatOnlyChromeIntent = 'inactive'
  let expandedPadding = { top: 12, bottom: 12 }
  let scrollAnchor: ReturnType<typeof preserveChatScroll> = null

  const stopScrollAnchor = () => {
    scrollAnchor?.stop()
    scrollAnchor = null
  }

  const beginScrollAnchor = () => {
    stopScrollAnchor()
    if (body && !purchaseOpen) scrollAnchor = preserveChatScroll(body, TRANSITION_FALLBACK_MS)
  }

  const setPaddingTarget = (collapsed: boolean) => {
    if (!body) return
    // Keep these targets independent of temporary chrome measurement classes.
    for (const [property, value] of [
      [IFRAME_CHAT_ONLY_TOP_PADDING_VAR, `${collapsed ? 12 : expandedPadding.top}px`],
      [IFRAME_CHAT_ONLY_BOTTOM_PADDING_VAR, `${collapsed ? 12 : expandedPadding.bottom}px`],
    ] as const) {
      if (body.style.getPropertyValue(property) !== value) body.style.setProperty(property, value)
    }
  }

  const clearTimer = () => {
    if (settleTimer !== null) window.clearTimeout(settleTimer)
    settleTimer = null
  }

  const disconnectTargetObserver = () => {
    targetObserver?.disconnect()
    targetObserver = null
  }

  const replaceMeasurements = (nextElements: HTMLElement[]) => {
    // YouTube can replace chrome before its mutation records are delivered.
    // Release every previous target before losing its reference, even on expand.
    clearMeasurements(elements)
    elements = nextElements
    expandedPadding = measure(elements)
  }

  const clearChromePresentation = (target = body) => {
    stopScrollAnchor()
    clearTimer()
    const accessibleTarget = isAccessibleNode(target) ? target : null
    accessibleTarget?.classList.remove(
      IFRAME_CHAT_ONLY_CLASS,
      IFRAME_CHAT_ONLY_MODE_CLASS,
      IFRAME_CHAT_ONLY_TRANSITION_CLASS,
      IFRAME_CHAT_ONLY_MEASURING_CLASS,
    )
    clearMeasurements(elements)
    elements = []
    expandedPadding = { top: 12, bottom: 12 }
    accessibleTarget?.style.removeProperty(IFRAME_CHAT_ONLY_TOP_PADDING_VAR)
    accessibleTarget?.style.removeProperty(IFRAME_CHAT_ONLY_BOTTOM_PADDING_VAR)
  }

  const setPurchaseOpen = (open: boolean) => {
    if (open) stopScrollAnchor()
    purchaseOpen = open
    if (body && body.classList.contains(IFRAME_PURCHASE_ACTIVE_CLASS) !== open) {
      body.classList.toggle(IFRAME_PURCHASE_ACTIVE_CLASS, open)
    }
  }

  const cleanup = (target = body) => {
    documentObserver?.disconnect()
    documentObserver = null
    disconnectTargetObserver()
    stopPurchaseObserver?.()
    stopPurchaseObserver = null
    purchaseOpen = false
    if (isAccessibleNode(target)) target.classList.remove(IFRAME_PURCHASE_ACTIVE_CLASS)
    clearChromePresentation(target)
  }

  const refreshCollapsedMeasurements = (nextElements = body ? resolveChatOnlyChromeElements(body) : []) => {
    if (!body?.classList.contains(IFRAME_CHAT_ONLY_CLASS)) return
    const measuredScroll = purchaseOpen ? null : preserveChatScroll(body, 0)
    body.classList.add(IFRAME_CHAT_ONLY_MEASURING_CLASS)
    body.classList.remove(IFRAME_CHAT_ONLY_TRANSITION_CLASS, IFRAME_CHAT_ONLY_CLASS)
    body.getBoundingClientRect()
    replaceMeasurements(nextElements)
    body.classList.add(IFRAME_CHAT_ONLY_CLASS)
    body.getBoundingClientRect()
    body.classList.remove(IFRAME_CHAT_ONLY_MEASURING_CLASS)
    measuredScroll?.restore()
    measuredScroll?.stop()
  }

  const ensureTargetObserver = () => {
    if (!body) return
    if (!stopPurchaseObserver) {
      stopPurchaseObserver = observeChatPurchaseUI(
        body,
        open => {
          setPurchaseOpen(open)
          applyRequestedIntent()
        },
        purchaseOpen,
      )
    }
    if (targetObserver || requestedIntent === 'inactive') return
    targetObserver = new MutationObserver(mutations => {
      if (!body?.classList.contains(IFRAME_CHAT_ONLY_CLASS)) return
      if (!mutations.some(mutation => mutationMayChangeChrome(mutation, elements))) return
      const nextElements = resolveChatOnlyChromeElements(body)
      const chromeElements = [...new Set([...elements, ...nextElements])]
      const touchesChrome = mutations.some(mutation =>
        chromeElements.some(element => element === mutation.target || element.contains(mutation.target)),
      )
      if (!sameElements(elements, nextElements) || touchesChrome) refreshCollapsedMeasurements(nextElements)
    })
    targetObserver.observe(body, { childList: true, subtree: true })
  }

  const bind = (nextIframe: HTMLIFrameElement | null) => {
    const nextBody = getBody(nextIframe)
    let nextDocument = nextBody?.ownerDocument ?? null
    if (!nextDocument) {
      try {
        nextDocument = nextIframe?.contentDocument ?? null
      } catch {
        // Cross-origin navigation is outside this document lease's ownership.
      }
    }
    if (nextIframe === iframe && nextDocument === chatDocument && nextBody === body) {
      ensureTargetObserver()
      return
    }
    const continuePurchase = nextIframe === iframe && nextDocument === chatDocument && purchaseOpen
    cleanup()
    iframe = nextIframe
    chatDocument = nextDocument
    body = nextBody
    // A shallow body clone can carry our previous transition and padding targets.
    // Re-establish this lease's presentation from the current intent and native UI.
    clearChromePresentation()
    purchaseOpen = continuePurchase
    if (nextDocument?.documentElement) {
      const observedDocument = nextDocument
      const observedIframe = nextIframe
      documentObserver = new MutationObserver(() => {
        if (observedDocument !== chatDocument || observedIframe !== iframe || observedDocument.body === body) return
        bind(observedIframe)
        applyRequestedIntent()
      })
      documentObserver.observe(observedDocument.documentElement, { childList: true })
    }
    ensureTargetObserver()
  }

  const collapse = () => {
    if (!body || body.classList.contains(IFRAME_CHAT_ONLY_CLASS)) return
    beginScrollAnchor()
    replaceMeasurements(resolveChatOnlyChromeElements(body))
    blurActiveElement(body)
    body.classList.add(IFRAME_CHAT_ONLY_TRANSITION_CLASS)
    body.getBoundingClientRect()
    body.classList.add(IFRAME_CHAT_ONLY_CLASS)
    setPaddingTarget(true)
    scrollAnchor?.restore()
    clearTimer()
    settleTimer = window.setTimeout(() => {
      body?.classList.remove(IFRAME_CHAT_ONLY_TRANSITION_CLASS)
      settleTimer = null
    }, TRANSITION_FALLBACK_MS)
  }

  const expand = () => {
    if (!body) return
    if (!body.classList.contains(IFRAME_CHAT_ONLY_CLASS)) {
      setPaddingTarget(false)
      return
    }
    beginScrollAnchor()
    body.classList.add(IFRAME_CHAT_ONLY_MEASURING_CLASS)
    body.classList.remove(IFRAME_CHAT_ONLY_TRANSITION_CLASS, IFRAME_CHAT_ONLY_CLASS)
    body.getBoundingClientRect()
    replaceMeasurements(resolveChatOnlyChromeElements(body))
    body.classList.add(IFRAME_CHAT_ONLY_CLASS)
    body.getBoundingClientRect()
    body.classList.remove(IFRAME_CHAT_ONLY_MEASURING_CLASS)
    body.classList.add(IFRAME_CHAT_ONLY_TRANSITION_CLASS)
    body.classList.remove(IFRAME_CHAT_ONLY_CLASS)
    setPaddingTarget(false)
    scrollAnchor?.restore()
    clearTimer()
    settleTimer = window.setTimeout(() => {
      body?.classList.remove(IFRAME_CHAT_ONLY_TRANSITION_CLASS)
      clearMeasurements(elements)
      elements = []
      settleTimer = null
    }, TRANSITION_FALLBACK_MS)
  }

  const applyRequestedIntent = () => {
    if (!body || requestedIntent === 'inactive' || requestedIntent === 'hold') return
    // Synchronize before blur, including native changes not yet delivered by
    // MutationObserver. While an offer is open, hover loss cannot hide it.
    setPurchaseOpen(hasOpenChatPurchaseUI(body, purchaseOpen))
    if (!body.classList.contains(IFRAME_CHAT_ONLY_MODE_CLASS)) {
      body.classList.add(IFRAME_CHAT_ONLY_MODE_CLASS)
      if (requestedIntent === 'expanded' || purchaseOpen) {
        replaceMeasurements(resolveChatOnlyChromeElements(body))
        clearMeasurements(elements)
        elements = []
      }
    }
    if (requestedIntent === 'collapsed' && !purchaseOpen) collapse()
    else expand()
  }

  return {
    sync(nextIframe: HTMLIFrameElement | null, intent: ChatOnlyChromeIntent) {
      requestedIntent = intent
      bind(nextIframe)
      if (!body) return
      if (intent === 'hold') {
        stopScrollAnchor()
        return
      }
      if (intent === 'inactive') {
        setPurchaseOpen(hasOpenChatPurchaseUI(body, purchaseOpen))
        disconnectTargetObserver()
        clearChromePresentation()
      } else applyRequestedIntent()
    },
    release() {
      requestedIntent = 'inactive'
      cleanup()
      iframe = null
      chatDocument = null
      body = null
    },
  }
}
