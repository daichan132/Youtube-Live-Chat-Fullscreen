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
  chatItemListRendererProbe,
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

export const resolveChatOnlyChromeElements = (body: HTMLElement, candidates = [...body.querySelectorAll<HTMLElement>(CHROME_SELECTOR)]) => {
  const visible = candidates.filter(element => hasNativeVisibleAncestry(element, body, true))
  const header = visible.find(element => element.localName === HEADER_SELECTOR)
  const input = visible.find(element => element.id === 'input-panel')
  const fallbacks = visible.filter(
    element => INPUT_FALLBACK_TAGS.includes(element.localName) && !element.parentElement?.closest(INPUT_FALLBACK_SELECTOR),
  )
  return [header, ...(input ? [input] : fallbacks)].filter((element): element is HTMLElement => element != null)
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

const hasNativeVisibleAncestry = (element: HTMLElement, body: HTMLElement, layoutOnly = false) => {
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
  let content: HTMLElement | null = null
  let contentVisible = false
  let visibleChrome: HTMLElement[] = []
  let knownChrome: HTMLElement[] = []
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
    if (isAccessibleNode(body)) {
      body.removeEventListener('transitionend', settleLayout)
      body.removeEventListener('animationend', settleLayout)
    }
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
    content = null
    contentVisible = false
    visibleChrome = []
    knownChrome = []
    if (isAccessibleNode(target)) target.classList.remove(IFRAME_PURCHASE_ACTIVE_CLASS)
    clearChromePresentation(target)
  }

  const measureChrome = (nextElements: HTMLElement[]) => {
    if (!body) return
    body.classList.add(IFRAME_CHAT_ONLY_MEASURING_CLASS)
    body.classList.remove(IFRAME_CHAT_ONLY_TRANSITION_CLASS, IFRAME_CHAT_ONLY_CLASS)
    body.getBoundingClientRect()
    replaceMeasurements(nextElements)
    body.classList.add(IFRAME_CHAT_ONLY_CLASS)
    body.getBoundingClientRect()
    body.classList.remove(IFRAME_CHAT_ONLY_MEASURING_CLASS)
  }

  const refreshCollapsedMeasurements = (nextElements = body ? resolveChatOnlyChromeElements(body) : []) => {
    if (!body?.classList.contains(IFRAME_CHAT_ONLY_CLASS)) return
    const measuredScroll = purchaseOpen ? null : preserveChatScroll(body, 0)
    measureChrome(nextElements)
    measuredScroll?.restore()
    measuredScroll?.stop()
  }

  const touchesLayout = (target: Node) =>
    target !== body && (Boolean(content && target.contains(content)) || knownChrome.some(element => target.contains(element)))
  const settleLayout = (event: Event) => {
    if (event.target && touchesLayout(event.target as Node)) applyRequestedIntent()
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
    body.addEventListener('transitionend', settleLayout)
    body.addEventListener('animationend', settleLayout)
    targetObserver = new MutationObserver(mutations => {
      if (!body) return
      if (
        mutations.some(mutation => {
          if (touchesLayout(mutation.target)) return true
          return [...mutation.addedNodes, ...mutation.removedNodes].some(node => {
            if (content && node.contains(content)) return true
            if (node.nodeType !== Node.ELEMENT_NODE) return false
            const element = node as Element
            if (element.localName === chatItemListRendererProbe.selectors[0]) return true
            if (!element.childElementCount || element.localName.endsWith('-message-renderer')) return false
            return element.querySelector(chatItemListRendererProbe.selectors[0]) !== null
          })
        })
      ) {
        applyRequestedIntent()
      }
      if (mutations.every(mutation => mutation.type === 'attributes')) return
      if (!body.classList.contains(IFRAME_CHAT_ONLY_CLASS)) return
      if (!mutations.some(mutation => mutationMayChangeChrome(mutation, elements))) return
      const nextElements = resolveChatOnlyChromeElements(body)
      const chromeElements = [...new Set([...elements, ...nextElements])]
      const touchesChrome = mutations.some(mutation =>
        chromeElements.some(element => element === mutation.target || element.contains(mutation.target)),
      )
      if (!sameElements(elements, nextElements) || touchesChrome) refreshCollapsedMeasurements(nextElements)
    })
    targetObserver.observe(body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'inert'],
    })
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
        if (
          !isAccessibleNode(observedDocument) ||
          observedDocument !== chatDocument ||
          observedIframe !== iframe ||
          observedDocument.body === body
        )
          return
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
    measureChrome(resolveChatOnlyChromeElements(body))
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
    const targetBody = body
    if (!targetBody || requestedIntent === 'inactive' || requestedIntent === 'hold') return
    const candidates = [...targetBody.querySelectorAll<HTMLElement>(chatItemListRendererProbe.selectors[0])]
    const nextContent = candidates.find(element => hasNativeVisibleAncestry(element, targetBody, true)) ?? candidates[0] ?? null
    const nextVisible = nextContent !== null && hasNativeVisibleAncestry(nextContent, targetBody, true)
    knownChrome = [...targetBody.querySelectorAll<HTMLElement>(CHROME_SELECTOR)]
    const nextChrome = resolveChatOnlyChromeElements(targetBody, knownChrome)
    if (content !== nextContent || contentVisible !== nextVisible) {
      clearChromePresentation()
    } else if (!sameElements(visibleChrome, nextChrome) && targetBody.classList.contains(IFRAME_CHAT_ONLY_MODE_CLASS)) {
      if (targetBody.classList.contains(IFRAME_CHAT_ONLY_CLASS)) refreshCollapsedMeasurements(nextChrome)
      else {
        replaceMeasurements(nextChrome)
        clearMeasurements(elements)
        elements = []
        setPaddingTarget(false)
      }
    }
    content = nextContent
    contentVisible = nextVisible
    visibleChrome = nextChrome
    if (!contentVisible) return
    // Synchronize before blur, including native changes not yet delivered by
    // MutationObserver. While an offer is open, hover loss cannot hide it.
    setPurchaseOpen(hasOpenChatPurchaseUI(targetBody, purchaseOpen))
    if (!targetBody.classList.contains(IFRAME_CHAT_ONLY_MODE_CLASS)) {
      targetBody.classList.add(IFRAME_CHAT_ONLY_MODE_CLASS)
      if (requestedIntent === 'expanded' || purchaseOpen) {
        replaceMeasurements(resolveChatOnlyChromeElements(targetBody))
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
