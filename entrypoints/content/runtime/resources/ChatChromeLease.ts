import {
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_MEASURING_CLASS,
  IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_TRANSITION_CLASS,
} from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'

export type ChatOnlyChromeIntent = 'inactive' | 'hold' | 'expanded' | 'collapsed'

const HEADER_SELECTOR = 'yt-live-chat-header-renderer'
const INPUT_PANEL_ID = 'input-panel'
const INPUT_PANEL_SELECTOR = `#${INPUT_PANEL_ID}`
const INPUT_FALLBACK_SELECTOR = [
  'yt-live-chat-message-input-renderer',
  'yt-live-chat-restricted-participation-renderer',
  'yt-live-chat-sign-in-prompt-renderer',
].join(', ')
const CHROME_TARGET_SELECTOR = `${HEADER_SELECTOR}, ${INPUT_PANEL_SELECTOR}, ${INPUT_FALLBACK_SELECTOR}`
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
  for (const element of elements) {
    element.style.setProperty(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR, `${Math.max(0, Math.ceil(element.getBoundingClientRect().height))}px`)
  }
}

const sameElements = (left: HTMLElement[], right: HTMLElement[]) =>
  left.length === right.length && left.every((element, index) => element === right[index])

const containsChromeTarget = (node: Node) => {
  // Nodes belong to the iframe's realm, so instanceof Element would reject them.
  if (node.nodeType !== Node.ELEMENT_NODE) return false
  const element = node as Element
  return element.matches(CHROME_TARGET_SELECTOR) || element.querySelector(CHROME_TARGET_SELECTOR) !== null
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

  const mutationMayChangeChrome = (mutation: MutationRecord) => {
    if (mutation.type === 'attributes') {
      // The input panel can acquire or lose its identity without being replaced.
      return (
        mutation.oldValue === INPUT_PANEL_ID ||
        (mutation.target.nodeType === Node.ELEMENT_NODE && (mutation.target as Element).id === INPUT_PANEL_ID)
      )
    }
    if (elements.some(element => element === mutation.target || element.contains(mutation.target))) return true
    for (const nodes of [mutation.addedNodes, mutation.removedNodes]) {
      for (const node of nodes) {
        if (elements.some(element => node === element || node.contains(element)) || containsChromeTarget(node)) return true
      }
    }
    return false
  }

  const ensureTargetObserver = () => {
    if (!body || targetObserver) return
    targetObserver = new MutationObserver(mutations => {
      if (!body?.classList.contains(IFRAME_CHAT_ONLY_CLASS)) return
      // Most live-chat mutations append messages. Inspect only the changed
      // subtrees before considering a search through the entire chat body.
      if (!mutations.some(mutationMayChangeChrome)) return
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
      attributeFilter: ['id'],
      attributeOldValue: true,
    })
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
