import { useEffect, useRef } from 'react'
import { SHADOW_HOST_ID } from '@/entrypoints/content/constants/domIds'
import { isNativeChatToggleButton, isNativeChatTriggerTarget } from '@/entrypoints/content/utils/nativeChat'

interface UseNativeChatAutoDisableOptions {
  enabled: boolean
  nativeChatOpen: boolean
  setYTDLiveChat: (value: boolean) => void
  autoDisableOnNativeOpen?: boolean
}

export const useNativeChatAutoDisable = ({
  enabled,
  nativeChatOpen,
  setYTDLiveChat,
  autoDisableOnNativeOpen = true,
}: UseNativeChatAutoDisableOptions) => {
  const prevNativeChatOpenRef = useRef<boolean | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (!autoDisableOnNativeOpen) return

    const handlePointerDown = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const shadowHost = document.getElementById(SHADOW_HOST_ID)
      if (shadowHost?.shadowRoot?.contains(target)) return

      const isToggleButton = isNativeChatToggleButton(target)
      const isTriggerTarget = isToggleButton || isNativeChatTriggerTarget(target)
      if (!isTriggerTarget) return

      if (isToggleButton) {
        setYTDLiveChat(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [autoDisableOnNativeOpen, enabled, setYTDLiveChat])

  useEffect(() => {
    const prev = prevNativeChatOpenRef.current
    prevNativeChatOpenRef.current = nativeChatOpen

    if (!enabled) return
    if (!autoDisableOnNativeOpen) return

    if (prev === null) {
      if (nativeChatOpen) {
        setYTDLiveChat(false)
      }
      return
    }

    if (!prev && nativeChatOpen) {
      setYTDLiveChat(false)
    }
  }, [autoDisableOnNativeOpen, enabled, nativeChatOpen, setYTDLiveChat])
}
