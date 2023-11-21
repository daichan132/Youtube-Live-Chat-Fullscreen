import { create } from 'zustand';
import { wrapStore } from 'webext-zustand';

interface YTDLiveChatNoLsStoreState {
  isHover: boolean;
  isDisplay: boolean;
  setIsHover: (isHover: boolean) => void;
  setIsDisplay: (isDisplay: boolean) => void;
}

export const useYTDLiveChatNoLsStore = create<YTDLiveChatNoLsStoreState>()((set) => ({
  isHover: false,
  isDisplay: false,
  setIsHover: (isHover) => set(() => ({ isHover })),
  setIsDisplay: (isDisplay) => set(() => ({ isDisplay })),
}));

export const ytdLiveChatNoLsStoreReadyPromise = wrapStore(useYTDLiveChatNoLsStore);

export default useYTDLiveChatNoLsStore;
