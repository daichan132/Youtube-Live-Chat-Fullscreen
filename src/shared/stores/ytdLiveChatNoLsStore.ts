import { create } from 'zustand'

interface clipState {
  header: number
  input: number
}
interface YTDLiveChatNoLsStoreState {
  isHover: boolean
  isDisplay: boolean
  isOpenSettingModal: boolean
  isIframeLoaded: boolean
  clip: clipState
  isClipPath: boolean | undefined
  iframeElement: HTMLIFrameElement | null
  menuItem: 'setting' | 'preset'
  setIsHover: (isHover: boolean) => void
  setIsDisplay: (isDisplay: boolean) => void
  setIsOpenSettingModal: (isSettingModal: boolean) => void
  setIsIframeLoaded: (isIframeLoaded: boolean) => void
  setClip: (clip: clipState) => void
  setIsClipPath: (isClipPath: boolean | undefined) => void
  setIFrameElement: (iframeElement: HTMLIFrameElement | null) => void
  setMenuItem: (menuItem: 'setting' | 'preset') => void
}

export const useYTDLiveChatNoLsStore = create<YTDLiveChatNoLsStoreState>()(set => ({
  isHover: false,
  isDisplay: true,
  isOpenSettingModal: false,
  isIframeLoaded: false,
  clip: {
    header: 0,
    input: 0,
  },
  isClipPath: undefined,
  iframeElement: null,
  menuItem: 'preset',
  setIsHover: isHover => set(() => ({ isHover })),
  setIsDisplay: isDisplay => set(() => ({ isDisplay })),
  setIsOpenSettingModal: isOpenSettingModal => set(() => ({ isOpenSettingModal })),
  setIsIframeLoaded: isIframeLoaded => set(() => ({ isIframeLoaded })),
  setClip: clip => set(() => ({ clip })),
  setIsClipPath: isClipPath => set(() => ({ isClipPath })),
  setIFrameElement: iframeElement => set(() => ({ iframeElement })),
  setMenuItem: menuItem => set(() => ({ menuItem })),
}))

export default useYTDLiveChatNoLsStore
