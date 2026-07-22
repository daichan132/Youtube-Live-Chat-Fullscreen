import {
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_MEASURING_CLASS,
  IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_TRANSITION_CLASS,
} from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'

export type ChatOnlyChromeIntent = 'inactive' | 'hold' | 'expanded' | 'collapsed'

type ChatOnlyChromePhase = 'expanded' | 'expanding' | 'collapsed' | 'collapsing'

type ChatOnlyChromeTarget = {
  element: HTMLElement
}

type ChatOnlyChromeControllerOptions = {
  onDocumentChange?: () => void
}

const HEADER_SELECTOR = 'yt-live-chat-header-renderer'
const INPUT_PANEL_SELECTOR = '#input-panel'
const INPUT_FALLBACK_SELECTOR = [
  'yt-live-chat-message-input-renderer',
  'yt-live-chat-restricted-participation-renderer',
  'yt-live-chat-sign-in-prompt-renderer',
].join(', ')

const DEFAULT_TRANSITION_DURATION_MS = 260
const TRANSITION_FALLBACK_BUFFER_MS = 50

const getIframeBody = (iframe: HTMLIFrameElement | null) => {
  try {
    return iframe?.contentDocument?.body ?? null
  } catch {
    return null
  }
}

const resolveOutermostInputFallbacks = (body: HTMLElement) => {
  const candidates = Array.from(body.querySelectorAll<HTMLElement>(INPUT_FALLBACK_SELECTOR))
  return candidates.filter(candidate => !candidate.parentElement?.closest(INPUT_FALLBACK_SELECTOR))
}

export const resolveChatOnlyChromeTargets = (body: HTMLElement): ChatOnlyChromeTarget[] => {
  const header = body.querySelector<HTMLElement>(HEADER_SELECTOR)
  const inputPanel = body.querySelector<HTMLElement>(INPUT_PANEL_SELECTOR)
  const inputTargets = inputPanel ? [inputPanel] : resolveOutermostInputFallbacks(body)
  const targets: ChatOnlyChromeTarget[] = []

  if (header) {
    targets.push({ element: header })
  }
  targets.push(...inputTargets.map(element => ({ element })))

  return targets
}

const targetsMatch = (left: ChatOnlyChromeTarget[], right: ChatOnlyChromeTarget[]) =>
  left.length === right.length && left.every((target, index) => target.element === right[index]?.element)

const parseCssTime = (value: string) => {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return 0
  return value.trim().endsWith('ms') ? parsed : parsed * 1000
}

const getTransitionFallbackMs = (targets: ChatOnlyChromeTarget[]) => {
  let longestTransitionMs = 0

  for (const { element } of targets) {
    const view = element.ownerDocument.defaultView
    if (!view) continue

    const style = view.getComputedStyle(element)
    const durations = style.transitionDuration.split(',').map(parseCssTime)
    const delays = style.transitionDelay.split(',').map(parseCssTime)
    const count = Math.max(durations.length, delays.length)

    for (let index = 0; index < count; index += 1) {
      const duration = durations[index % durations.length] ?? 0
      const delay = delays[index % delays.length] ?? 0
      longestTransitionMs = Math.max(longestTransitionMs, duration + delay)
    }
  }

  return (longestTransitionMs || DEFAULT_TRANSITION_DURATION_MS) + TRANSITION_FALLBACK_BUFFER_MS
}

const clearMetricVariables = (targets: ChatOnlyChromeTarget[]) => {
  for (const { element } of targets) {
    element.style.removeProperty(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)
  }
}

const measureTargets = (targets: ChatOnlyChromeTarget[]) => {
  clearMetricVariables(targets)
  for (const { element } of targets) {
    const height = Math.max(0, Math.ceil(element.getBoundingClientRect().height))
    element.style.setProperty(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR, `${height}px`)
  }
}

const blurActiveElement = (body: HTMLElement) => {
  const activeElement = body.ownerDocument.activeElement
  if (activeElement && 'blur' in activeElement && typeof activeElement.blur === 'function') {
    activeElement.blur()
  }
}

export const createChatOnlyChromeController = ({ onDocumentChange }: ChatOnlyChromeControllerOptions = {}) => {
  let iframe: HTMLIFrameElement | null = null
  let body: HTMLElement | null = null
  let intent: ChatOnlyChromeIntent = 'inactive'
  let phase: ChatOnlyChromePhase = 'expanded'
  let cachedTargets: ChatOnlyChromeTarget[] = []
  let pendingHeldCollapsed = false
  let transitionToken = 0
  let cancelTransition: (() => void) | null = null

  const stopTransition = () => {
    transitionToken += 1
    cancelTransition?.()
    cancelTransition = null
  }

  const cleanupBody = (targetBody: HTMLElement | null) => {
    stopTransition()
    targetBody?.classList.remove(IFRAME_CHAT_ONLY_CLASS, IFRAME_CHAT_ONLY_TRANSITION_CLASS, IFRAME_CHAT_ONLY_MEASURING_CLASS)
    clearMetricVariables(cachedTargets)
    if (targetBody) clearMetricVariables(resolveChatOnlyChromeTargets(targetBody))
    cachedTargets = []
    phase = 'expanded'
  }

  const collapseImmediately = () => {
    if (!body) return
    cachedTargets = resolveChatOnlyChromeTargets(body)
    measureTargets(cachedTargets)
    body.classList.add(IFRAME_CHAT_ONLY_CLASS)
    phase = 'collapsed'
  }

  const bindCurrentDocument = (preserveCollapsedOverride = pendingHeldCollapsed) => {
    const nextBody = getIframeBody(iframe)
    if (nextBody === body) return false

    const preserveCollapsedState =
      preserveCollapsedOverride || (intent === 'hold' && body?.classList.contains(IFRAME_CHAT_ONLY_CLASS) === true)
    cleanupBody(body)
    body = nextBody
    if (body) {
      onDocumentChange?.()
      if (preserveCollapsedState) {
        collapseImmediately()
        pendingHeldCollapsed = false
      }
    } else if (preserveCollapsedState) {
      pendingHeldCollapsed = true
    }
    return true
  }

  const settleTransition = (token: number, targetPhase: 'expanded' | 'collapsed') => {
    if (token !== transitionToken || !body) return

    stopTransition()
    body.classList.remove(IFRAME_CHAT_ONLY_TRANSITION_CLASS)
    phase = targetPhase
    if (targetPhase === 'expanded') {
      clearMetricVariables(cachedTargets)
      cachedTargets = []
    }
  }

  const startTransition = (targetPhase: 'expanded' | 'collapsed', targets: ChatOnlyChromeTarget[]) => {
    stopTransition()
    const token = transitionToken

    if (targets.length === 0) {
      settleTransition(token, targetPhase)
      return
    }

    const pendingElements = new Set(targets.map(target => target.element))
    const listeners = targets.map(({ element }) => {
      const listener = (event: Event) => {
        const transitionEvent = event as TransitionEvent
        if (event.target !== element || transitionEvent.propertyName !== 'height' || token !== transitionToken) return

        pendingElements.delete(element)
        if (pendingElements.size === 0) settleTransition(token, targetPhase)
      }
      element.addEventListener('transitionend', listener)
      return { element, listener }
    })
    const timer = setTimeout(() => settleTransition(token, targetPhase), getTransitionFallbackMs(targets))

    cancelTransition = () => {
      clearTimeout(timer)
      for (const { element, listener } of listeners) {
        element.removeEventListener('transitionend', listener)
      }
    }
  }

  const collapse = () => {
    if (!body || body.classList.contains(IFRAME_CHAT_ONLY_CLASS)) return

    const targets = resolveChatOnlyChromeTargets(body)
    if (phase !== 'expanding' || cachedTargets.length === 0 || !targetsMatch(cachedTargets, targets)) {
      clearMetricVariables(cachedTargets)
      cachedTargets = targets
      measureTargets(cachedTargets)
    }

    stopTransition()
    blurActiveElement(body)
    body.classList.add(IFRAME_CHAT_ONLY_TRANSITION_CLASS)
    body.getBoundingClientRect()
    body.classList.add(IFRAME_CHAT_ONLY_CLASS)
    phase = 'collapsing'
    startTransition('collapsed', cachedTargets)
  }

  const expand = () => {
    if (!body?.classList.contains(IFRAME_CHAT_ONLY_CLASS)) return

    const currentTargets = resolveChatOnlyChromeTargets(body)
    if (phase === 'collapsed' || !targetsMatch(cachedTargets, currentTargets)) {
      stopTransition()
      clearMetricVariables(cachedTargets)
      body.classList.add(IFRAME_CHAT_ONLY_MEASURING_CLASS)
      body.classList.remove(IFRAME_CHAT_ONLY_TRANSITION_CLASS, IFRAME_CHAT_ONLY_CLASS)
      body.getBoundingClientRect()

      cachedTargets = resolveChatOnlyChromeTargets(body)
      measureTargets(cachedTargets)

      body.classList.add(IFRAME_CHAT_ONLY_CLASS)
      body.getBoundingClientRect()
      body.classList.remove(IFRAME_CHAT_ONLY_MEASURING_CLASS)
    }

    stopTransition()
    body.classList.add(IFRAME_CHAT_ONLY_TRANSITION_CLASS)
    body.getBoundingClientRect()
    body.classList.remove(IFRAME_CHAT_ONLY_CLASS)
    phase = 'expanding'
    startTransition('expanded', cachedTargets)
  }

  const applyIntent = () => {
    if (!body) return

    if (intent === 'inactive') {
      cleanupBody(body)
      return
    }
    if (intent === 'hold') return
    if (intent === 'collapsed') {
      collapse()
      return
    }
    expand()
  }

  const handleIframeLoad = () => {
    bindCurrentDocument()
    applyIntent()
  }

  const bindIframe = (nextIframe: HTMLIFrameElement | null) => {
    if (nextIframe === iframe) {
      bindCurrentDocument()
      return
    }

    const preserveCollapsedState = pendingHeldCollapsed || (intent === 'hold' && body?.classList.contains(IFRAME_CHAT_ONLY_CLASS) === true)
    if (preserveCollapsedState) pendingHeldCollapsed = true
    iframe?.removeEventListener('load', handleIframeLoad)
    cleanupBody(body)
    iframe = nextIframe
    body = null
    iframe?.addEventListener('load', handleIframeLoad)
    bindCurrentDocument(preserveCollapsedState)
  }

  return {
    sync(nextIframe: HTMLIFrameElement | null, nextIntent: ChatOnlyChromeIntent) {
      intent = nextIntent
      if (intent !== 'hold') pendingHeldCollapsed = false
      bindIframe(nextIframe)
      applyIntent()
    },
    dispose() {
      iframe?.removeEventListener('load', handleIframeLoad)
      cleanupBody(body)
      iframe = null
      body = null
      intent = 'inactive'
      pendingHeldCollapsed = false
    },
  }
}
