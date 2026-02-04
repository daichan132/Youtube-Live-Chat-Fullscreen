import { useEffect, useRef } from 'react'
import { isNativeChatToggleButton, isNativeChatTriggerTarget } from '@/entrypoints/content/utils/nativeChat'

interface UseNativeChatAutoDisableOptions {
  enabled: boolean
  nativeChatOpen: boolean
  setYTDLiveChat: (value: boolean) => void
}

export const useNativeChatAutoDisable = ({ enabled, nativeChatOpen, setYTDLiveChat }: UseNativeChatAutoDisableOptions) => {
  const prevNativeChatOpenRef = useRef<boolean | null>(null)

  useEffect(() => {
    const handlePointerDown = (event: Event) => {
      if (!enabled) return
      const target = event.target as HTMLElement | null
      if (!target) return

      const shadowHost = document.getElementById('shadow-root-live-chat')
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
  }, [enabled, setYTDLiveChat])

  useEffect(() => {
    const prev = prevNativeChatOpenRef.current
    prevNativeChatOpenRef.current = nativeChatOpen

    if (!enabled) return

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
