import { create } from 'zustand';
import { wrapStore } from 'webext-zustand';

interface YTDLiveChatNoLsStoreState {
  isHover: boolean;
  isDisplay: boolean;
  isOpenSettingModal: boolean;
  isIframeLoaded: boolean;
  setIsHover: (isHover: boolean) => void;
  setIsDisplay: (isDisplay: boolean) => void;
  setIsOpenSettingModal: (isSettingModal: boolean) => void;
  setIsIframeLoaded: (isIframeLoaded: boolean) => void;
}

export const useYTDLiveChatNoLsStore = create<YTDLiveChatNoLsStoreState>()((set) => ({
  isHover: false,
  isDisplay: true,
  isOpenSettingModal: false,
  isIframeLoaded: false,
  setIsHover: (isHover) => set(() => ({ isHover })),
  setIsDisplay: (isDisplay) => set(() => ({ isDisplay })),
  setIsOpenSettingModal: (isOpenSettingModal) => set(() => ({ isOpenSettingModal })),
  setIsIframeLoaded: (isIframeLoaded) => set(() => ({ isIframeLoaded })),
}));

export const ytdLiveChatNoLsStoreReadyPromise = wrapStore(useYTDLiveChatNoLsStore);

export default useYTDLiveChatNoLsStore;
