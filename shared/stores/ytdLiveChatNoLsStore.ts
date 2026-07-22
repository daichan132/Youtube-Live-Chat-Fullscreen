import { create } from 'zustand'

interface YTDLiveChatNoLsStoreState {
  isHover: boolean
  isDisplay: boolean
  isOpenSettingModal: boolean
  isIframeLoaded: boolean
  isAutoOpeningNativeChat: boolean
  iframeElement: HTMLIFrameElement | null
  menuItem: 'setting' | 'preset'
  setIsHover: (isHover: boolean) => void
  setIsDisplay: (isDisplay: boolean) => void
  setIsOpenSettingModal: (isSettingModal: boolean) => void
  setIsIframeLoaded: (isIframeLoaded: boolean) => void
  setIsAutoOpeningNativeChat: (isAutoOpeningNativeChat: boolean) => void
  setIFrameElement: (iframeElement: HTMLIFrameElement | null) => void
  setMenuItem: (menuItem: 'setting' | 'preset') => void
}

export const useYTDLiveChatNoLsStore = create<YTDLiveChatNoLsStoreState>()(set => ({
  isHover: false,
  isDisplay: true,
  isOpenSettingModal: false,
  isIframeLoaded: false,
  isAutoOpeningNativeChat: false,
  iframeElement: null,
  menuItem: 'setting',
  setIsHover: isHover => set(() => ({ isHover })),
  setIsDisplay: isDisplay => set(() => ({ isDisplay })),
  setIsOpenSettingModal: isOpenSettingModal => set(() => ({ isOpenSettingModal })),
  setIsIframeLoaded: isIframeLoaded => set(() => ({ isIframeLoaded })),
  setIsAutoOpeningNativeChat: isAutoOpeningNativeChat => set(() => ({ isAutoOpeningNativeChat })),
  setIFrameElement: iframeElement => set(() => ({ iframeElement })),
  setMenuItem: menuItem => set(() => ({ menuItem })),
}))
