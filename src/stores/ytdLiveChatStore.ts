import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { wrapStore } from 'webext-zustand';
import { localStorage } from 'redux-persist-webextension-storage';
import { RGBColor } from 'react-color';

interface YTDLiveChatStoreState {
  rgba: RGBColor;
  setRgba: (rgba: RGBColor) => void;
}

export const useYTDLiveChatStore = create<YTDLiveChatStoreState>()(
  persist(
    (set) => ({
      rgba: { r: 255, g: 255, b: 255, a: 1 },
      setRgba: (rgba) => set(() => ({ rgba })),
    }),
    {
      name: 'ytdLiveChatStore',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const ytdLiveChatStoreReadyPromise = wrapStore(useYTDLiveChatStore);

export default useYTDLiveChatStore;
