import { useCallback, useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_HEADER_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_INPUT_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_INPUT_PANEL_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_RESTRICTED_PARTICIPATION_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_SIGN_IN_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_TRANSITION_CLASS,
} from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'

interface ChatOnlyChromeEffectProps {
  isDragging: boolean
  isResizing: boolean
  isControlRailHiding?: boolean
}

const CHAT_ONLY_TRANSITION_CLEANUP_MS = 260
const CHAT_ONLY_CHROME_METRICS = [
  { selector: 'yt-live-chat-header-renderer', variable: IFRAME_CHAT_ONLY_HEADER_HEIGHT_VAR },
  { selector: 'yt-live-chat-message-input-renderer', variable: IFRAME_CHAT_ONLY_INPUT_HEIGHT_VAR },
  { selector: 'yt-live-chat-restricted-participation-renderer', variable: IFRAME_CHAT_ONLY_RESTRICTED_PARTICIPATION_HEIGHT_VAR },
  { selector: '#input-panel', variable: IFRAME_CHAT_ONLY_INPUT_PANEL_HEIGHT_VAR },
  { selector: 'yt-live-chat-sign-in-prompt-renderer', variable: IFRAME_CHAT_ONLY_SIGN_IN_HEIGHT_VAR },
] as const

const getElementHeight = (element: Element) => {
  const boxHeight = element.getBoundingClientRect().height
  const scrollHeight = element instanceof HTMLElement ? element.scrollHeight : 0
  return Math.ceil(Math.max(boxHeight, scrollHeight, 0))
}

const setChatOnlyChromeMetrics = (body: HTMLElement) => {
  for (const { selector, variable } of CHAT_ONLY_CHROME_METRICS) {
    const element = body.querySelector(selector)
    if (!element) continue

    const height = getElementHeight(element)
    body.style.setProperty(variable, `${height}px`)
  }

  body.classList.add(IFRAME_CHAT_ONLY_TRANSITION_CLASS)
}

const prepareChatOnlyChromeTransition = (body: HTMLElement) => {
  setChatOnlyChromeMetrics(body)
  body.getBoundingClientRect()
}

const clearChatOnlyChromeMetrics = (body: HTMLElement) => {
  body.classList.remove(IFRAME_CHAT_ONLY_TRANSITION_CLASS)
  for (const { variable } of CHAT_ONLY_CHROME_METRICS) {
    body.style.removeProperty(variable)
  }
}

/**
 * Controls chat-only chrome visibility inside the iframe.
 * The persisted panel geometry is intentionally left untouched.
 */
export const ChatOnlyChromeEffect = ({ isDragging, isResizing, isControlRailHiding = false }: ChatOnlyChromeEffectProps) => {
  const { alwaysOnDisplay, chatOnlyDisplay } = useYTDLiveChatStore(
    useShallow(state => ({
      chatOnlyDisplay: state.chatOnlyDisplay,
      alwaysOnDisplay: state.alwaysOnDisplay,
    })),
  )

  const { isHover, isChatOnlyChromeHidden, isIframeLoaded, isOpenSettingModal, iframeElement, setIsChatOnlyChromeHidden, setIsHover } =
    useYTDLiveChatNoLsStore(
      useShallow(state => ({
        isHover: state.isHover,
        isOpenSettingModal: state.isOpenSettingModal,
        isChatOnlyChromeHidden: state.isChatOnlyChromeHidden,
        isIframeLoaded: state.isIframeLoaded,
        iframeElement: state.iframeElement,
        setIsChatOnlyChromeHidden: state.setIsChatOnlyChromeHidden,
        setIsHover: state.setIsHover,
      })),
    )

  const hasAutoCollapsedOnLoadRef = useRef(false)
  const lastAutoCollapseIframeRef = useRef<HTMLIFrameElement | null>(null)
  const transitionCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const unmountCleanupRef = useRef<() => void>(() => {})

  const iframeBody = iframeElement?.contentDocument?.body

  const removeFocus = useCallback(() => {
    const activeElement = iframeElement?.contentDocument?.activeElement
    if (activeElement instanceof HTMLElement) {
      activeElement.blur()
    }
  }, [iframeElement])

  useEffect(() => {
    if (isDragging || isResizing || isControlRailHiding) return

    const shouldHideChatChrome = isIframeLoaded && alwaysOnDisplay && chatOnlyDisplay && (isOpenSettingModal || !isHover)

    const timer = setTimeout(() => {
      setIsChatOnlyChromeHidden(shouldHideChatChrome)
    }, 10)

    return () => clearTimeout(timer)
  }, [
    isHover,
    alwaysOnDisplay,
    isOpenSettingModal,
    chatOnlyDisplay,
    isDragging,
    isResizing,
    isControlRailHiding,
    setIsChatOnlyChromeHidden,
    isIframeLoaded,
  ])

  // If hover is already true right after load, auto-clear once so chat-only mode can start without user action.
  useEffect(() => {
    if (lastAutoCollapseIframeRef.current !== iframeElement) {
      lastAutoCollapseIframeRef.current = iframeElement
      hasAutoCollapsedOnLoadRef.current = false
    }

    if (!isIframeLoaded || !alwaysOnDisplay || !chatOnlyDisplay) {
      hasAutoCollapsedOnLoadRef.current = false
      return
    }

    if (isOpenSettingModal || isDragging || isResizing) return
    if (!isHover || isChatOnlyChromeHidden || hasAutoCollapsedOnLoadRef.current) return

    const timer = setTimeout(() => {
      setIsHover(false)
      hasAutoCollapsedOnLoadRef.current = true
    }, 80)

    return () => clearTimeout(timer)
  }, [
    iframeElement,
    isHover,
    isChatOnlyChromeHidden,
    alwaysOnDisplay,
    isOpenSettingModal,
    chatOnlyDisplay,
    isDragging,
    isResizing,
    isIframeLoaded,
    setIsHover,
  ])

  unmountCleanupRef.current = () => {
    if (transitionCleanupTimerRef.current) {
      clearTimeout(transitionCleanupTimerRef.current)
      transitionCleanupTimerRef.current = undefined
    }

    const body = useYTDLiveChatNoLsStore.getState().iframeElement?.contentDocument?.body
    body?.classList.remove(IFRAME_CHAT_ONLY_CLASS)
    if (body) {
      clearChatOnlyChromeMetrics(body)
    }

    if (useYTDLiveChatNoLsStore.getState().isChatOnlyChromeHidden) {
      setIsChatOnlyChromeHidden(undefined)
    }

    setIsHover(false)
  }

  useEffect(() => {
    return () => {
      unmountCleanupRef.current()
    }
  }, [])

  useEffect(() => {
    if (isChatOnlyChromeHidden === undefined) return
    if (!iframeBody) return

    if (isChatOnlyChromeHidden) {
      if (transitionCleanupTimerRef.current) {
        clearTimeout(transitionCleanupTimerRef.current)
        transitionCleanupTimerRef.current = undefined
      }
      removeFocus()
      prepareChatOnlyChromeTransition(iframeBody)
      iframeBody.classList.add(IFRAME_CHAT_ONLY_CLASS)
      hasAutoCollapsedOnLoadRef.current = true
    } else {
      prepareChatOnlyChromeTransition(iframeBody)
      iframeBody.classList.remove(IFRAME_CHAT_ONLY_CLASS)
      if (transitionCleanupTimerRef.current) {
        clearTimeout(transitionCleanupTimerRef.current)
      }
      transitionCleanupTimerRef.current = setTimeout(() => {
        clearChatOnlyChromeMetrics(iframeBody)
        transitionCleanupTimerRef.current = undefined
      }, CHAT_ONLY_TRANSITION_CLEANUP_MS)
    }
  }, [isChatOnlyChromeHidden, iframeBody, removeFocus])

  return null
}
