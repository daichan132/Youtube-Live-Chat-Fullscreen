import { useEffect } from 'react'

import { useIdle } from 'react-use'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatNoLsStore } from '@/shared/stores'

export const DisplayEffect = () => {
  const { isOpenSettingModal, isHover, setIsDisplay } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      isOpenSettingModal: state.isOpenSettingModal,
      isHover: state.isHover,
      setIsDisplay: state.setIsDisplay,
    })),
  )
  const isIdle = useIdle(1e3)

  useEffect(() => {
    // Keep chat visible when the tab/window is unfocused to avoid
    // unexpected disappearance while using a second monitor.
    // Also show when hovering, active (not idle), or settings are open.
    const isFocused = typeof document !== 'undefined' ? document.hasFocus() : true
    setIsDisplay(isHover || !isIdle || isOpenSettingModal || !isFocused)
  }, [isHover, isIdle, setIsDisplay, isOpenSettingModal])

  return null
}
