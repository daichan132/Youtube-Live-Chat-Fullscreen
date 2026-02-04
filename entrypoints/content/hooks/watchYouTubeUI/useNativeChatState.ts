import { useEffect, useState } from 'react'
import {
  isNativeChatExpanded as getNativeChatExpanded,
  isNativeChatUsable as getNativeChatUsable,
} from '@/entrypoints/content/utils/nativeChatState'

export const useNativeChatState = (isFullscreen: boolean) => {
  const [isNativeChatOpen, setIsNativeChatOpen] = useState(false)
  const [isNativeChatExpanded, setIsNativeChatExpanded] = useState(false)

  useEffect(() => {
    // Fullscreen hides native chat but leaves DOM in place; treat it as closed.
    if (isFullscreen) {
      setIsNativeChatOpen(false)
      setIsNativeChatExpanded(false)
      return
    }

    const updateNativeChatExpanded = () => {
      setIsNativeChatExpanded(getNativeChatExpanded())
    }

    const updateNativeChatOpen = () => {
      setIsNativeChatOpen(getNativeChatUsable())
    }

    updateNativeChatExpanded()
    updateNativeChatOpen()
    if (!document.body) return

    const observer = new MutationObserver(() => {
      updateNativeChatExpanded()
      updateNativeChatOpen()
    })
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      childList: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'live-chat-present-and-expanded', 'is-two-columns_'],
    })

    const resizeObserver = new ResizeObserver(() => {
      updateNativeChatOpen()
    })
    const attachResizeObserver = () => {
      const secondary = document.querySelector('#secondary')
      const chatFrame = document.querySelector('ytd-live-chat-frame')
      if (secondary) resizeObserver.observe(secondary)
      if (chatFrame) resizeObserver.observe(chatFrame)
    }
    attachResizeObserver()

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
    }
  }, [isFullscreen])

  return { isNativeChatOpen, isNativeChatExpanded }
}
