import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { SHADOW_HOST_ID } from '@/entrypoints/content/constants/domIds'
import { isNativeChatToggleButton, isNativeChatTriggerTarget } from '@/entrypoints/content/utils/nativeChat'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'

interface UseNativeChatAutoDisableOptions {
  enabled: boolean
  nativeChatOpen: boolean
  isFullscreen: boolean
  setYTDLiveChat: (value: boolean) => void
}

/**
 * Automatically disables extension chat when user interacts with native chat.
 * This respects user intent - if they want to use YouTube's native chat, we step aside.
 */
export const useNativeChatAutoDisable = ({ enabled, nativeChatOpen, isFullscreen, setYTDLiveChat }: UseNativeChatAutoDisableOptions) => {
  const prevNativeChatOpenRef = useRef<boolean | null>(null)
  const { isAutoOpeningNativeChat, setIsAutoOpeningNativeChat } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      isAutoOpeningNativeChat: state.isAutoOpeningNativeChat,
      setIsAutoOpeningNativeChat: state.setIsAutoOpeningNativeChat,
    })),
  )

  // Detect clicks on native chat toggle buttons
  useEffect(() => {
    if (!enabled) return

    const handlePointerDown = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const shadowHost = document.getElementById(SHADOW_HOST_ID)
      if (shadowHost && (target === shadowHost || shadowHost.contains(target) || target.closest(`#${SHADOW_HOST_ID}`))) return
      if (shadowHost?.shadowRoot?.contains(target)) return

      const isToggleButton = isNativeChatToggleButton(target)
      const isTriggerTarget = isToggleButton || isNativeChatTriggerTarget(target)
      if (!isTriggerTarget) return

      if (isToggleButton && isFullscreen) {
        setYTDLiveChat(false)
        return
      }

      if (isToggleButton && !nativeChatOpen) {
        setYTDLiveChat(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [enabled, nativeChatOpen, isFullscreen, setYTDLiveChat])

  // Detect when native chat state changes to open
  // Only triggers on actual state TRANSITIONS (closed → open), not on initial observation
  useEffect(() => {
    if (!enabled) {
      prevNativeChatOpenRef.current = null
      if (isAutoOpeningNativeChat) {
        setIsAutoOpeningNativeChat(false)
      }
      return
    }

    const prev = prevNativeChatOpenRef.current
    prevNativeChatOpenRef.current = nativeChatOpen

    // Skip initial observation - we only care about state transitions
    // This prevents disabling YLC when the extension is re-enabled while native chat is already open
    if (prev === null) {
      return
    }

    // If we auto-opened native chat, clear the flag once it is observed open.
    if (!prev && nativeChatOpen && isAutoOpeningNativeChat) {
      setIsAutoOpeningNativeChat(false)
      return
    }

    // Only disable YLC when native chat transitions from closed to open
    if (!prev && nativeChatOpen) {
      setYTDLiveChat(false)
    }
  }, [enabled, nativeChatOpen, setYTDLiveChat, isAutoOpeningNativeChat, setIsAutoOpeningNativeChat])
}
