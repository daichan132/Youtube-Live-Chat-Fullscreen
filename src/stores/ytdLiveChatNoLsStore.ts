import { create } from 'zustand';
import { wrapStore } from 'webext-zustand';

interface clipState {
  header: number;
  input: number;
}
interface YTDLiveChatNoLsStoreState {
  isHover: boolean;
  isDisplay: boolean;
  isOpenSettingModal: boolean;
  isIframeLoaded: boolean;
  clip: clipState;
  setIsHover: (isHover: boolean) => void;
  setIsDisplay: (isDisplay: boolean) => void;
  setIsOpenSettingModal: (isSettingModal: boolean) => void;
  setIsIframeLoaded: (isIframeLoaded: boolean) => void;
  setClip: (clip: clipState) => void;
}

export const useYTDLiveChatNoLsStore = create<YTDLiveChatNoLsStoreState>()((set) => ({
  isHover: false,
  isDisplay: true,
  isOpenSettingModal: false,
  isIframeLoaded: false,
  clip: {
    header: 0,
    input: 0,
  },
  setIsHover: (isHover) => set(() => ({ isHover })),
  setIsDisplay: (isDisplay) => set(() => ({ isDisplay })),
  setIsOpenSettingModal: (isOpenSettingModal) => set(() => ({ isOpenSettingModal })),
  setIsIframeLoaded: (isIframeLoaded) => set(() => ({ isIframeLoaded })),
  setClip: (clip) => set(() => ({ clip })),
}));

export const ytdLiveChatNoLsStoreReadyPromise = wrapStore(useYTDLiveChatNoLsStore);

export default useYTDLiveChatNoLsStore;
