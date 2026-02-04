import { useEffect, useRef } from 'react'
import { SHADOW_HOST_ID } from '@/entrypoints/content/constants/domIds'
import { isNativeChatToggleButton, isNativeChatTriggerTarget } from '@/entrypoints/content/utils/nativeChat'

interface UseNativeChatAutoDisableOptions {
  enabled: boolean
  nativeChatOpen: boolean
  setYTDLiveChat: (value: boolean) => void
}

/**
 * Automatically disables extension chat when user interacts with native chat.
 * This respects user intent - if they want to use YouTube's native chat, we step aside.
 */
export const useNativeChatAutoDisable = ({ enabled, nativeChatOpen, setYTDLiveChat }: UseNativeChatAutoDisableOptions) => {
  const prevNativeChatOpenRef = useRef<boolean | null>(null)

  // Detect clicks on native chat toggle buttons
  useEffect(() => {
    if (!enabled) return

    const handlePointerDown = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const shadowHost = document.getElementById(SHADOW_HOST_ID)
      if (shadowHost?.shadowRoot?.contains(target)) return

      const isToggleButton = isNativeChatToggleButton(target)
      const isTriggerTarget = isToggleButton || isNativeChatTriggerTarget(target)
      if (!isTriggerTarget) return

      if (isToggleButton && !nativeChatOpen) {
        setYTDLiveChat(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [enabled, nativeChatOpen, setYTDLiveChat])

  // Detect when native chat state changes to open
  useEffect(() => {
    if (!enabled) {
      prevNativeChatOpenRef.current = null
      return
    }

    const prev = prevNativeChatOpenRef.current
    prevNativeChatOpenRef.current = nativeChatOpen

    if (prev === null) {
      if (nativeChatOpen) {
        setYTDLiveChat(false)
      }
      return
    }

    if (!prev && nativeChatOpen) {
      setYTDLiveChat(false)
    }
  }, [enabled, nativeChatOpen, setYTDLiveChat])
}
