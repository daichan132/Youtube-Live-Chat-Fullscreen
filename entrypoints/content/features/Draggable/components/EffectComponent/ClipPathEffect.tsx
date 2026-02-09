import { useEffect, useRef } from 'react'
import { useUnmount, useUpdateEffect } from 'react-use'
import { useShallow } from 'zustand/react/shallow'
import { IFRAME_CLIP_PATH_CLASS } from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import { useClipPathManagement } from '../../hooks/useClipPathManagement'

interface ClipPathEffectProps {
  isDragging: boolean
  isResizing: boolean
}

interface Clip {
  header: number
  input: number
}

const isSameClip = (a: Clip, b: Clip) => a.header === b.header && a.input === b.input

/**
 * Component that handles clip path effects for the draggable chat window
 * Manages when to show/hide header and input areas based on user interaction
 */
export const ClipPathEffect = ({ isDragging, isResizing }: ClipPathEffectProps) => {
  const { alwaysOnDisplay, chatOnlyDisplay, setSize, setCoordinates } = useYTDLiveChatStore(
    useShallow(state => ({
      chatOnlyDisplay: state.chatOnlyDisplay,
      alwaysOnDisplay: state.alwaysOnDisplay,
      setSize: state.setSize,
      setCoordinates: state.setCoordinates,
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

  const isClipGeometryAppliedRef = useRef(false)
  const appliedClipRef = useRef<Clip | null>(null)
  const hasAutoCollapsedOnLoadRef = useRef(false)
  const lastAutoCollapseIframeRef = useRef<HTMLIFrameElement | null>(null)

  // Extract clip path management logic to a custom hook
  const { handleClipPathChange, getClip, removeFocus } = useClipPathManagement({
    setCoordinates,
    setSize,
    iframeElement,
  })

  /* ---------------------------- Clip Path update ---------------------------- */
  useEffect(() => {
    // Determine if clip path should be enabled
    const shouldEnableClipPath =
      isIframeLoaded && alwaysOnDisplay && chatOnlyDisplay && !isDragging && !isResizing && (isOpenSettingModal || !isHover)

    // Set clip path state with small delay
    const timer = setTimeout(() => {
      setIsClipPath(shouldEnableClipPath)
    }, 10)

    return () => clearTimeout(timer)
  }, [isHover, alwaysOnDisplay, isOpenSettingModal, chatOnlyDisplay, isDragging, isResizing, setIsClipPath, isIframeLoaded])

  // If hover is already true right after load, auto-clear once so chat-only clip can start without user action.
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

  /* ------------------------- handle Clip Path change ------------------------ */
  useUpdateEffect(() => {
    const body = iframeElement?.contentDocument?.body
    if (isClipPath === undefined || body === undefined) return

    // Remove focus from any active elements
    removeFocus()

    // Update clip settings and handle coordinate/size changes
    const newClip = getClip()
    setClip(newClip)

    // Keep clip/height changes paired so visible chat height stays stable.
    if (isClipPath && !isClipGeometryAppliedRef.current) {
      handleClipPathChange(true, newClip)
      appliedClipRef.current = newClip
      hasAutoCollapsedOnLoadRef.current = true
      isClipGeometryAppliedRef.current = true
      return
    }

    if (!isClipPath && isClipGeometryAppliedRef.current) {
      handleClipPathChange(false, appliedClipRef.current ?? newClip)
      appliedClipRef.current = null
      isClipGeometryAppliedRef.current = false
    }
  }, [isClipPath, isIframeLoaded, iframeElement])

  // Keep clip geometry synchronized while clip mode is enabled.
  // This covers cases where header/input render late and initial clip is measured as zero.
  useEffect(() => {
    const body = iframeElement?.contentDocument?.body
    if (!isClipPath || !isIframeLoaded || !body) return

    let retryCount = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const syncClipGeometry = () => {
      const latestClip = getClip()
      setClip(latestClip)

      if (!isClipGeometryAppliedRef.current) {
        handleClipPathChange(true, latestClip)
        appliedClipRef.current = latestClip
        hasAutoCollapsedOnLoadRef.current = true
        isClipGeometryAppliedRef.current = true
      } else if (appliedClipRef.current && !isSameClip(appliedClipRef.current, latestClip)) {
        handleClipPathChange(false, appliedClipRef.current)
        handleClipPathChange(true, latestClip)
        appliedClipRef.current = latestClip
      }

      retryCount += 1
      const shouldRetry = latestClip.header === 0 && latestClip.input === 0 && retryCount < 20
      if (shouldRetry) {
        timer = setTimeout(syncClipGeometry, 120)
      }
    }

    timer = setTimeout(syncClipGeometry, 120)
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isClipPath, isIframeLoaded, iframeElement, getClip, handleClipPathChange, setClip])

  // Clean up when component unmounts
  useUnmount(() => {
    if (isClipGeometryAppliedRef.current) {
      handleClipPathChange(false, appliedClipRef.current ?? getClip())
      appliedClipRef.current = null
      isClipGeometryAppliedRef.current = false
    }

    if (isClipPath) {
      setIsClipPath(undefined)
    }
    setIsHover(false)
  })

  /* ---------------------------- add style change ---------------------------- */
  useUpdateEffect(() => {
    const body = iframeElement?.contentDocument?.body
    if (!body) return

    // Toggle CSS class based on clip path state
    if (isClipPath) {
      body.classList.add(IFRAME_CLIP_PATH_CLASS)
    } else {
      body.classList.remove(IFRAME_CLIP_PATH_CLASS)
    }
  }, [isClipPath])

  return null
}
