import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { wrapStore } from 'webext-zustand';
import { localStorage } from 'redux-persist-webextension-storage';
import { RGBColor } from 'react-color';
import { Coordinates } from '@dnd-kit/core/dist/types';

interface sizeType {
  width: number;
  height: number;
}
interface YTDLiveChatStoreState {
  bgColor: RGBColor;
  fontColor: RGBColor;
  blur: number;
  size: sizeType;
  coordinates: Coordinates;
  setBgColor: (bgColor: RGBColor) => void;
  setFontColor: (fontColor: RGBColor) => void;
  setBlur: (blur: number) => void;
  setSize: (size: sizeType) => void;
  setCoordinates: (coordinates: Coordinates) => void;
  setDefaultPosition: () => void;
}

export const useYTDLiveChatStore = create<YTDLiveChatStoreState>()(
  persist(
    (set) => ({
      bgColor: { r: 255, g: 255, b: 255, a: 1 },
      fontColor: { r: 0, g: 0, b: 0, a: 1 },
      blur: 0,
      size: { width: 400, height: 500 },
      coordinates: { x: 20, y: 20 },
      setBgColor: (bgColor) => set(() => ({ bgColor })),
      setFontColor: (fontColor) => set(() => ({ fontColor })),
      setBlur: (blur) => set(() => ({ blur })),
      setSize: (size) => set(() => ({ size })),
      setCoordinates: (coordinates) => set(() => ({ coordinates })),
      setDefaultPosition: () =>
        set(() => ({ size: { width: 400, height: 500 }, coordinates: { x: 20, y: 20 } })),
    }),
    {
      name: 'ytdLiveChatStore',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const ytdLiveChatStoreReadyPromise = wrapStore(useYTDLiveChatStore);

export default useYTDLiveChatStore;
