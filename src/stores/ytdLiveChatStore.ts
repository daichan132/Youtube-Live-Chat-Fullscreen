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
  fontFamily: string;
  fontSize: number;
  blur: number;
  size: sizeType;
  coordinates: Coordinates;
  alwaysOnDisplay: boolean;
  reactionButtonDisplay: boolean;
  setBgColor: (bgColor: RGBColor) => void;
  setFontColor: (fontColor: RGBColor) => void;
  setFontFamily: (fontFamily: string) => void;
  setFontSize: (fontSize: number) => void;
  setBlur: (blur: number) => void;
  setSize: (size: sizeType) => void;
  setCoordinates: (coordinates: Coordinates) => void;
  setDefaultPosition: () => void;
  setAlwaysOnDisplay: (alwaysOnDisplay: boolean) => void;
  setReactionButtonDisplay: (reactionButtonDisplay: boolean) => void;
}

export const useYTDLiveChatStore = create<YTDLiveChatStoreState>()(
  persist(
    (set) => ({
      bgColor: { r: 255, g: 255, b: 255, a: 1 },
      fontColor: { r: 0, g: 0, b: 0, a: 1 },
      fontFamily: '',
      fontSize: 13,
      blur: 0,
      size: { width: 400, height: 500 },
      coordinates: { x: 20, y: 20 },
      alwaysOnDisplay: false,
      reactionButtonDisplay: true,
      setBgColor: (bgColor) => set(() => ({ bgColor })),
      setFontColor: (fontColor) => set(() => ({ fontColor })),
      setFontFamily: (fontFamily) => set(() => ({ fontFamily })),
      setFontSize: (fontSize) => set(() => ({ fontSize })),
      setBlur: (blur) => set(() => ({ blur })),
      setSize: (size) => set(() => ({ size })),
      setCoordinates: (coordinates) => set(() => ({ coordinates })),
      setDefaultPosition: () =>
        set(() => ({ size: { width: 400, height: 500 }, coordinates: { x: 20, y: 20 } })),
      setAlwaysOnDisplay: (alwaysOnDisplay) => set(() => ({ alwaysOnDisplay })),
      setReactionButtonDisplay: (reactionButtonDisplay) => set(() => ({ reactionButtonDisplay })),
    }),
    {
      name: 'ytdLiveChatStore',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const ytdLiveChatStoreReadyPromise = wrapStore(useYTDLiveChatStore);

export default useYTDLiveChatStore;
