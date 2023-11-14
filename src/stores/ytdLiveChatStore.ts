import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { wrapStore } from 'webext-zustand';
import { localStorage } from 'redux-persist-webextension-storage';

interface YTDLiveChatStoreState {
  count: number;
  increment: () => void;
}

export const useYTDLiveChatStore = create<YTDLiveChatStoreState>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }),
    {
      name: 'ytdLiveChatStore',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const ytdLiveChatStoreReadyPromise = wrapStore(useYTDLiveChatStore);

export default useYTDLiveChatStore;
