import { create } from 'zustand';
import { wrapStore } from 'webext-zustand';

interface YTDLiveChatNoLsStoreState {
  isHover: boolean;
  isDisplay: boolean;
  isOpenSettingModal: boolean;
  setIsHover: (isHover: boolean) => void;
  setIsDisplay: (isDisplay: boolean) => void;
  setIsOpenSettingModal: (isSettingModal: boolean) => void;
}

export const useYTDLiveChatNoLsStore = create<YTDLiveChatNoLsStoreState>()((set) => ({
  isHover: false,
  isDisplay: false,
  isOpenSettingModal: false,
  setIsHover: (isHover) => set(() => ({ isHover })),
  setIsDisplay: (isDisplay) => set(() => ({ isDisplay })),
  setIsOpenSettingModal: (isOpenSettingModal) => set(() => ({ isOpenSettingModal })),
}));

export const ytdLiveChatNoLsStoreReadyPromise = wrapStore(useYTDLiveChatNoLsStore);

export default useYTDLiveChatNoLsStore;
