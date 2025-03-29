import { useCallback, useEffect } from 'react'
import { usePrevious, useUnmount, useUpdateEffect } from 'react-use'
import { useShallow } from 'zustand/react/shallow'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import { useClipPathManagement } from '../../hooks/useClipPathManagement'

interface ClipPathEffectProps {
  isDragging: boolean
  isResizing: boolean
}

/**
 * Component that handles clip path effects for the draggable chat window
 * Manages when to show/hide header and input areas based on user interaction
 */
export const ClipPathEffect = ({ isDragging, isResizing }: ClipPathEffectProps) => {
  const {
    alwaysOnDisplay,
    chatOnlyDisplay,
    setSize,
    setCoordinates
  } = useYTDLiveChatStore(
    useShallow(state => ({
      chatOnlyDisplay: state.chatOnlyDisplay,
      alwaysOnDisplay: state.alwaysOnDisplay,
      setSize: state.setSize,
      setCoordinates: state.setCoordinates,
    })),
  )

  const {
    isHover,
    isClipPath,
    isIframeLoaded,
    isOpenSettingModal,
    iframeElement,
    setIsClipPath,
    setIsHover,
    setClip
  } = useYTDLiveChatNoLsStore(
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

  const prevClipPath = usePrevious(isClipPath)

  // Extract clip path management logic to a custom hook
  const { handleClipPathChange, getClip, removeFocus } = useClipPathManagement({
    setCoordinates,
    setSize,
    iframeElement
  })

  /* ---------------------------- Clip Path update ---------------------------- */
  useEffect(() => {
    // Determine if clip path should be enabled
    const shouldEnableClipPath =
      isIframeLoaded &&
      alwaysOnDisplay &&
      chatOnlyDisplay &&
      !isDragging &&
      !isResizing &&
      (isOpenSettingModal || !isHover)

    // Set clip path state with small delay
    setTimeout(() => {
      setIsClipPath(shouldEnableClipPath)
    }, 10)
  }, [
    isHover,
    alwaysOnDisplay,
    isOpenSettingModal,
    chatOnlyDisplay,
    isDragging,
    isResizing,
    setIsClipPath,
    isIframeLoaded
  ])

  /* ------------------------- handle Clip Path change ------------------------ */
  useUpdateEffect(() => {
    const body = iframeElement?.contentDocument?.body
    if (isClipPath === undefined || prevClipPath === undefined || body === undefined) return

    // Remove focus from any active elements
    removeFocus()

    // Update clip settings and handle coordinate/size changes
    const newClip = getClip()
    if (newClip) setClip(newClip)
    handleClipPathChange(isClipPath)
  }, [isClipPath])

  // Clean up when component unmounts
  useUnmount(() => {
    if (isClipPath) {
      setIsClipPath(undefined)
      setIsHover(false)
      handleClipPathChange(false)
    }
  })

  /* ---------------------------- add style change ---------------------------- */
  useUpdateEffect(() => {
    const body = iframeElement?.contentDocument?.body
    if (!body) return

    // Toggle CSS class based on clip path state
    if (isClipPath) {
      body.classList.add('clip-path-enable')
    } else {
      body.classList.remove('clip-path-enable')
    }
  }, [isClipPath])

  return null
}
