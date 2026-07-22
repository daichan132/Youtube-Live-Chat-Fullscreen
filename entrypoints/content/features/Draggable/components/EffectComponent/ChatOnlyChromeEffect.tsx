import { useEffect, useLayoutEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import { type ChatOnlyChromeIntent, createChatOnlyChromeController } from './chatOnlyChromeController'

interface ChatOnlyChromeEffectProps {
  isDragging: boolean
  isResizing: boolean
  isControlRailHiding?: boolean
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

  const { isHover, isIframeLoaded, isOpenSettingModal, iframeElement, setIsHover } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      isHover: state.isHover,
      isOpenSettingModal: state.isOpenSettingModal,
      isIframeLoaded: state.isIframeLoaded,
      iframeElement: state.iframeElement,
      setIsHover: state.setIsHover,
    })),
  )

  const [controller] = useState(() =>
    createChatOnlyChromeController({
      // A new iframe Document starts a new pointer session. Clear only the
      // previous Document's hover state; subsequent pointer input is preserved.
      onDocumentChange: () => setIsHover(false),
    }),
  )

  const isChatOnlyActive = isIframeLoaded && alwaysOnDisplay && chatOnlyDisplay
  let intent: ChatOnlyChromeIntent

  if (!isChatOnlyActive) {
    intent = 'inactive'
  } else if (isDragging || isResizing || isControlRailHiding) {
    intent = 'hold'
  } else if (isOpenSettingModal || !isHover) {
    intent = 'collapsed'
  } else {
    intent = 'expanded'
  }

  useLayoutEffect(() => {
    controller.sync(iframeElement, intent)
  }, [controller, iframeElement, intent])

  useEffect(
    () => () => {
      controller.dispose()
      setIsHover(false)
    },
    [controller, setIsHover],
  )

  return null
}
