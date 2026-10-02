import {
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_MEASURING_CLASS,
  IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_TRANSITION_CLASS,
} from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'

export type ChatOnlyChromeIntent = 'inactive' | 'hold' | 'expanded' | 'collapsed'

const HEADER_SELECTOR = 'yt-live-chat-header-renderer'
const INPUT_PANEL_SELECTOR = '#input-panel'
const INPUT_FALLBACK_SELECTOR = [
  'yt-live-chat-message-input-renderer',
  'yt-live-chat-restricted-participation-renderer',
  'yt-live-chat-sign-in-prompt-renderer',
].join(', ')
const CHROME_SELECTOR = [HEADER_SELECTOR, INPUT_PANEL_SELECTOR, INPUT_FALLBACK_SELECTOR].join(', ')
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
  for (const element of elements) element.style.removeProperty(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)
}

const measure = (elements: HTMLElement[]) => {
  clearMeasurements(elements)
  // Read all heights before writing CSS so one write cannot invalidate the next read.
  const heights = elements.map(element => Math.max(0, Math.ceil(element.getBoundingClientRect().height)))
  elements.forEach((element, index) => {
    element.style.setProperty(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR, `${heights[index]}px`)
  })
}

const containsChrome = (node: Node) => {
  // Nodes belong to the iframe realm, so instanceof Element in the parent is unreliable.
  if (node.nodeType !== 1) return false
  const element = node as Element
  return element.matches(CHROME_SELECTOR) || (element.childElementCount > 0 && element.querySelector(CHROME_SELECTOR) !== null)
}

const mutationTouchesChrome = (mutation: MutationRecord, elements: HTMLElement[]) => {
  if (elements.some(element => element === mutation.target || element.contains(mutation.target))) return true
  const target = mutation.target.nodeType === 1 ? (mutation.target as Element) : mutation.target.parentElement
  // The message list cannot own header/input chrome. Skip its entire mutation
  // batch before inspecting individual messages or their growing subtrees.
  if (target?.closest('yt-live-chat-item-list-renderer')) return false
  return [...mutation.addedNodes, ...mutation.removedNodes].some(containsChrome)
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
  let body: HTMLElement | null = null
  let elements: HTMLElement[] = []
  let settleTimer: number | null = null
  let targetObserver: MutationObserver | null = null
  let measurementFrame: number | null = null

  const cancelMeasurement = () => {
    if (measurementFrame !== null) window.cancelAnimationFrame(measurementFrame)
    measurementFrame = null
  }

  const clearTimer = () => {
    if (settleTimer !== null) window.clearTimeout(settleTimer)
    settleTimer = null
  }

  const disconnectTargetObserver = () => {
    targetObserver?.disconnect()
    targetObserver = null
  }

  const cleanup = (target = body) => {
    clearTimer()
    cancelMeasurement()
    disconnectTargetObserver()
    target?.classList.remove(IFRAME_CHAT_ONLY_CLASS, IFRAME_CHAT_ONLY_TRANSITION_CLASS, IFRAME_CHAT_ONLY_MEASURING_CLASS)
    clearMeasurements(elements)
    elements = []
  }

  const refreshCollapsedMeasurements = (nextElements = body ? resolveChatOnlyChromeElements(body) : []) => {
    if (!body?.classList.contains(IFRAME_CHAT_ONLY_CLASS)) return
    body.classList.add(IFRAME_CHAT_ONLY_MEASURING_CLASS)
    body.classList.remove(IFRAME_CHAT_ONLY_TRANSITION_CLASS, IFRAME_CHAT_ONLY_CLASS)
    body.getBoundingClientRect()
    clearMeasurements(elements)
    elements = nextElements
    measure(elements)
    body.classList.add(IFRAME_CHAT_ONLY_CLASS)
    body.getBoundingClientRect()
    body.classList.remove(IFRAME_CHAT_ONLY_MEASURING_CLASS)
  }

  const ensureTargetObserver = () => {
    if (!body || targetObserver) return
    targetObserver = new MutationObserver(mutations => {
      if (!body?.classList.contains(IFRAME_CHAT_ONLY_CLASS) || measurementFrame !== null) return
      // Discover chrome only when a changed subtree can affect it. Message traffic
      // must not repeatedly search the entire growing chat document.
      if (!mutations.some(mutation => mutationTouchesChrome(mutation, elements))) return
      measurementFrame = window.requestAnimationFrame(() => {
        measurementFrame = null
        refreshCollapsedMeasurements()
      })
    })
    targetObserver.observe(body, { childList: true, characterData: true, subtree: true })
  }

  const bind = (nextIframe: HTMLIFrameElement | null) => {
    const nextBody = getBody(nextIframe)
    if (nextIframe === iframe && nextBody === body) {
      ensureTargetObserver()
      return
    }
    cleanup()
    iframe = nextIframe
    body = nextBody
    ensureTargetObserver()
  }

  const collapse = () => {
    if (!body || body.classList.contains(IFRAME_CHAT_ONLY_CLASS)) return
    elements = resolveChatOnlyChromeElements(body)
    measure(elements)
    blurActiveElement(body)
    body.classList.add(IFRAME_CHAT_ONLY_TRANSITION_CLASS)
    body.getBoundingClientRect()
    body.classList.add(IFRAME_CHAT_ONLY_CLASS)
    clearTimer()
    settleTimer = window.setTimeout(() => {
      body?.classList.remove(IFRAME_CHAT_ONLY_TRANSITION_CLASS)
      settleTimer = null
    }, TRANSITION_FALLBACK_MS)
  }

  const expand = () => {
    cancelMeasurement()
    if (!body?.classList.contains(IFRAME_CHAT_ONLY_CLASS)) return
    body.classList.add(IFRAME_CHAT_ONLY_MEASURING_CLASS)
    body.classList.remove(IFRAME_CHAT_ONLY_TRANSITION_CLASS, IFRAME_CHAT_ONLY_CLASS)
    body.getBoundingClientRect()
    elements = resolveChatOnlyChromeElements(body)
    measure(elements)
    body.classList.add(IFRAME_CHAT_ONLY_CLASS)
    body.getBoundingClientRect()
    body.classList.remove(IFRAME_CHAT_ONLY_MEASURING_CLASS)
    body.classList.add(IFRAME_CHAT_ONLY_TRANSITION_CLASS)
    body.classList.remove(IFRAME_CHAT_ONLY_CLASS)
    clearTimer()
    settleTimer = window.setTimeout(() => {
      body?.classList.remove(IFRAME_CHAT_ONLY_TRANSITION_CLASS)
      clearMeasurements(elements)
      elements = []
      settleTimer = null
    }, TRANSITION_FALLBACK_MS)
  }

  return {
    sync(nextIframe: HTMLIFrameElement | null, intent: ChatOnlyChromeIntent) {
      bind(nextIframe)
      if (!body || intent === 'hold') return
      if (intent === 'inactive') cleanup()
      else if (intent === 'collapsed') collapse()
      else expand()
    },
    release() {
      cleanup()
      iframe = null
      body = null
    },
  }
}
