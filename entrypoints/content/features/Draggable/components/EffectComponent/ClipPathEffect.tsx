import { useCallback, useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { IFRAME_CLIP_PATH_CLASS } from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import { isSameClip, measureClipFromBody } from '../../hooks/clipGeometry'

interface ClipPathEffectProps {
  isDragging: boolean
  isResizing: boolean
  isControlRailHiding?: boolean
}

/**
 * Measures chat chrome and controls chat-only crop state.
 * The persisted panel geometry is intentionally left untouched.
 */
export const ClipPathEffect = ({ isDragging, isResizing, isControlRailHiding = false }: ClipPathEffectProps) => {
  const { alwaysOnDisplay, chatOnlyDisplay } = useYTDLiveChatStore(
    useShallow(state => ({
      chatOnlyDisplay: state.chatOnlyDisplay,
      alwaysOnDisplay: state.alwaysOnDisplay,
    })),
  )

  const { isHover, isClipPath, isIframeLoaded, isOpenSettingModal, iframeElement, setIsClipPath, setIsHover, setClip } =
    useYTDLiveChatNoLsStore(
      useShallow(state => ({
        isHover: state.isHover,
        isOpenSettingModal: state.isOpenSettingModal,
        isClipPath: state.isClipPath,
        isIframeLoaded: state.isIframeLoaded,
        iframeElement: state.iframeElement,
        setIsClipPath: state.setIsClipPath,
        setIsHover: state.setIsHover,
        setClip: state.setClip,
      })),
    )

  const hasAutoCollapsedOnLoadRef = useRef(false)
  const lastAutoCollapseIframeRef = useRef<HTMLIFrameElement | null>(null)
  const didObserveClipPathChangeRef = useRef(false)
  const unmountCleanupRef = useRef<() => void>(() => {})

  const getClip = useCallback(() => measureClipFromBody(iframeElement?.contentDocument?.body), [iframeElement])
  const iframeBody = iframeElement?.contentDocument?.body

  const removeFocus = useCallback(() => {
    const activeElement = iframeElement?.contentDocument?.activeElement
    if (activeElement instanceof HTMLElement) {
      activeElement.blur()
    }
  }, [iframeElement])

  const updateMeasuredClip = useCallback(() => {
    const nextClip = getClip()
    const currentClip = useYTDLiveChatNoLsStore.getState().clip
    if (!isSameClip(currentClip, nextClip)) {
      setClip(nextClip)
    }
    return nextClip
  }, [getClip, setClip])

  useEffect(() => {
    if (isDragging || isResizing || isControlRailHiding) return

    const shouldEnableClipPath = isIframeLoaded && alwaysOnDisplay && chatOnlyDisplay && (isOpenSettingModal || !isHover)

    const timer = setTimeout(() => {
      setIsClipPath(shouldEnableClipPath)
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
    setIsClipPath,
    isIframeLoaded,
  ])

  // If hover is already true right after load, auto-clear once so chat-only crop can start without user action.
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
    if (!isHover || isClipPath || hasAutoCollapsedOnLoadRef.current) return

    const timer = setTimeout(() => {
      setIsHover(false)
      hasAutoCollapsedOnLoadRef.current = true
    }, 80)

    return () => clearTimeout(timer)
  }, [
    iframeElement,
    isHover,
    isClipPath,
    alwaysOnDisplay,
    isOpenSettingModal,
    chatOnlyDisplay,
    isDragging,
    isResizing,
    isIframeLoaded,
    setIsHover,
  ])

  useEffect(() => {
    if (!didObserveClipPathChangeRef.current) {
      didObserveClipPathChangeRef.current = true
      return
    }

    if (!isClipPath || !isIframeLoaded || iframeBody === undefined) return

    removeFocus()
    updateMeasuredClip()
    hasAutoCollapsedOnLoadRef.current = true
  }, [isClipPath, isIframeLoaded, iframeBody, removeFocus, updateMeasuredClip])

  // Header/input can become measurable after the iframe load event; keep the crop offsets fresh.
  useEffect(() => {
    const body = iframeElement?.contentDocument?.body
    if (!isClipPath || !isIframeLoaded || !body || isResizing) return

    let retryCount = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const syncClipMeasurement = () => {
      const latestClip = updateMeasuredClip()

      retryCount += 1
      const shouldRetry = latestClip.header === 0 && latestClip.input === 0 && retryCount < 20
      if (shouldRetry) {
        timer = setTimeout(syncClipMeasurement, 120)
      }
    }

    timer = setTimeout(syncClipMeasurement, 120)
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isClipPath, isIframeLoaded, iframeElement, isResizing, updateMeasuredClip])

  unmountCleanupRef.current = () => {
    if (useYTDLiveChatNoLsStore.getState().isClipPath) {
      setIsClipPath(undefined)
    }

    setIsHover(false)
  }

  useEffect(() => {
    return () => {
      unmountCleanupRef.current()
    }
  }, [])

  useEffect(() => {
    if (isClipPath === undefined) return
    if (!iframeBody) return

    if (isClipPath) {
      iframeBody.classList.add(IFRAME_CLIP_PATH_CLASS)
    } else {
      iframeBody.classList.remove(IFRAME_CLIP_PATH_CLASS)
    }
  }, [isClipPath, iframeBody])

  return null
}
