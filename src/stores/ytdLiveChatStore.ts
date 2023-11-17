import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { wrapStore } from 'webext-zustand';
import { localStorage } from 'redux-persist-webextension-storage';

interface YTDLiveChatStoreState {
  hex: string;
  alpha: number;
  setHex: (hex: string) => void;
  setAlpha: (alpha: number) => void;
}

export const useYTDLiveChatStore = create<YTDLiveChatStoreState>()(
  persist(
    (set) => ({
      hex: '#fff',
      alpha: 1,
      setHex: (hex) => set(() => ({ hex })),
      setAlpha: (alpha) => set(() => ({ alpha })),
    }),
    {
      name: 'ytdLiveChatStore',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const ytdLiveChatStoreReadyPromise = wrapStore(useYTDLiveChatStore);

export default useYTDLiveChatStore;
