import { useEffect } from 'react'
import { SHADOW_HOST_ID } from '@/entrypoints/content/constants/domIds'
import { isNativeChatToggleButton, isNativeChatTriggerTarget } from '@/entrypoints/content/utils/nativeChat'

type UseNativeChatAutoDisableOptions = {
  enabled: boolean
  setYTDLiveChat: (value: boolean) => void
}

/**
 * The runtime owns native chat observation. React only handles the explicit
 * user action that asks YouTube to open its own chat while our overlay is on.
 */
export const useNativeChatAutoDisable = ({ enabled, setYTDLiveChat }: UseNativeChatAutoDisableOptions) => {
  useEffect(() => {
    if (!enabled) return

    const handlePointerDown = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const shadowHost = document.getElementById(SHADOW_HOST_ID)
      if (shadowHost && (target === shadowHost || shadowHost.contains(target) || target.closest(`#${SHADOW_HOST_ID}`))) return
      if (shadowHost?.shadowRoot?.contains(target)) return

      if (!isNativeChatToggleButton(target) && !isNativeChatTriggerTarget(target)) return
      setYTDLiveChat(false)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [enabled, setYTDLiveChat])
}
