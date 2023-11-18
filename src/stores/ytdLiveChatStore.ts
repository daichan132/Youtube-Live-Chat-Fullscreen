import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { wrapStore } from 'webext-zustand';
import { localStorage } from 'redux-persist-webextension-storage';
import { RGBColor } from 'react-color';

interface sizeType {
  width: number;
  height: number;
}
interface YTDLiveChatStoreState {
  bgColor: RGBColor;
  blur: number;
  size: sizeType;
  setBgColor: (bgColor: RGBColor) => void;
  setBlur: (blur: number) => void;
  setSize: (size: sizeType) => void;
}

export const useYTDLiveChatStore = create<YTDLiveChatStoreState>()(
  persist(
    (set) => ({
      bgColor: { r: 255, g: 255, b: 255, a: 1 },
      blur: 0,
      size: { width: 400, height: 500 },
      setBgColor: (bgColor) => set(() => ({ bgColor })),
      setBlur: (blur) => set(() => ({ blur })),
      setSize: (size) => set(() => ({ size })),
    }),
    {
      name: 'ytdLiveChatStore',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const ytdLiveChatStoreReadyPromise = wrapStore(useYTDLiveChatStore);

export default useYTDLiveChatStore;
