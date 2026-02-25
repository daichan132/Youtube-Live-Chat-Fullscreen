import { useCallback, useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { IFRAME_CLIP_PATH_CLASS } from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import { useUnmount } from '@/shared/hooks/useUnmount'
import { useUpdateEffect } from '@/shared/hooks/useUpdateEffect'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import { deriveClippedLayout, isSameClip, isSameLayoutGeometry, type LayoutGeometry } from '../../hooks/clipGeometry'
import { useClipPathManagement } from '../../hooks/useClipPathManagement'

interface ClipPathEffectProps {
  isDragging: boolean
  isResizing: boolean
}

const toLayoutGeometry = (coordinates: { x: number; y: number }, size: { width: number; height: number }): LayoutGeometry => ({
  coordinates: {
    x: coordinates.x,
    y: coordinates.y,
  },
  size: {
    width: size.width,
    height: size.height,
  },
})

/**
 * Component that handles clip path effects for the draggable chat window
 * Manages when to show/hide header and input areas based on user interaction
 */
export const ClipPathEffect = ({ isDragging, isResizing }: ClipPathEffectProps) => {
  const { alwaysOnDisplay, chatOnlyDisplay, coordinates, size, setGeometry } = useYTDLiveChatStore(
    useShallow(state => ({
      chatOnlyDisplay: state.chatOnlyDisplay,
      alwaysOnDisplay: state.alwaysOnDisplay,
      coordinates: state.coordinates,
      size: state.size,
      setGeometry: state.setGeometry,
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

  const baseLayoutRef = useRef<LayoutGeometry>(toLayoutGeometry(coordinates, size))
  const prevIsClipPathRef = useRef<boolean | undefined>(isClipPath)
  const hasAutoCollapsedOnLoadRef = useRef(false)
  const lastAutoCollapseIframeRef = useRef<HTMLIFrameElement | null>(null)

  const { getClip, removeFocus } = useClipPathManagement({ iframeElement })

  const applyGeometry = useCallback(
    (nextLayout: LayoutGeometry) => {
      const liveState = useYTDLiveChatStore.getState()
      const currentLayout = toLayoutGeometry(liveState.coordinates, liveState.size)
      if (isSameLayoutGeometry(currentLayout, nextLayout)) return
      setGeometry(nextLayout)
    },
    [setGeometry],
  )

  // Keep the non-clip layout as the source of truth.
  useEffect(() => {
    const previousIsClipPath = prevIsClipPathRef.current
    prevIsClipPathRef.current = isClipPath

    if (isClipPath) return
    // Skip one frame right after clip-path is disabled so base is not overwritten
    // with the still-clipped geometry before restoration is applied.
    if (previousIsClipPath === true) return

    baseLayoutRef.current = toLayoutGeometry(coordinates, size)
  }, [isClipPath, coordinates, size])

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

    // Update clip settings and apply layout from the base geometry.
    const newClip = getClip()
    const currentClip = useYTDLiveChatNoLsStore.getState().clip
    if (!isSameClip(currentClip, newClip)) {
      setClip(newClip)
    }

    if (isClipPath) {
      applyGeometry(deriveClippedLayout(baseLayoutRef.current, newClip))
      hasAutoCollapsedOnLoadRef.current = true
      return
    }

    applyGeometry(baseLayoutRef.current)
  }, [isClipPath, isIframeLoaded, iframeElement, applyGeometry, getClip, removeFocus, setClip])

  // Keep clip geometry synchronized while clip mode is enabled.
  // This covers cases where header/input render late and initial clip is measured as zero,
  // while keeping geometry idempotent from a stable base layout.
  useEffect(() => {
    const body = iframeElement?.contentDocument?.body
    if (!isClipPath || !isIframeLoaded || !body) return

    let retryCount = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const syncClipGeometry = () => {
      const latestClip = getClip()
      const currentClip = useYTDLiveChatNoLsStore.getState().clip
      if (!isSameClip(currentClip, latestClip)) {
        setClip(latestClip)
      }
      applyGeometry(deriveClippedLayout(baseLayoutRef.current, latestClip))

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
  }, [isClipPath, isIframeLoaded, iframeElement, getClip, setClip, applyGeometry])

  // Clean up when component unmounts
  useUnmount(() => {
    const noLsState = useYTDLiveChatNoLsStore.getState()
    if (noLsState.isClipPath) {
      const liveState = useYTDLiveChatStore.getState()
      const currentLayout = toLayoutGeometry(liveState.coordinates, liveState.size)
      if (!isSameLayoutGeometry(currentLayout, baseLayoutRef.current)) {
        liveState.setGeometry(baseLayoutRef.current)
      }
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
