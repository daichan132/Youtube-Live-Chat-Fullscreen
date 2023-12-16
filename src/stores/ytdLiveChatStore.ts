import { localStorage } from 'redux-persist-webextension-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { Coordinates } from '@dnd-kit/core/dist/types';
import type { RGBColor } from 'react-color';

export interface sizeType {
  width: number;
  height: number;
}
interface YTDLiveChatStoreState {
  bgColor: RGBColor;
  fontColor: RGBColor;
  fontFamily: string;
  fontSize: number;
  blur: number;
  space: number;
  size: sizeType;
  coordinates: Coordinates;
  alwaysOnDisplay: boolean;
  chatOnlyDisplay: boolean;
  userNameDisplay: boolean;
  userIconDisplay: boolean;
  reactionButtonDisplay: boolean;
  setBgColor: (bgColor: RGBColor) => void;
  setFontColor: (fontColor: RGBColor) => void;
  setFontFamily: (fontFamily: string) => void;
  setFontSize: (fontSize: number) => void;
  setBlur: (blur: number) => void;
  setSpace: (space: number) => void;
  setSize: (size: sizeType) => void;
  setCoordinates: (coordinates: Coordinates) => void;
  setDefaultPosition: () => void;
  setAlwaysOnDisplay: (alwaysOnDisplay: boolean) => void;
  setChatOnlyDisplay: (chatOnlyDisplay: boolean) => void;
  setUserNameDisplay: (userNameDisplay: boolean) => void;
  setUserIconDisplay: (userIconDisplay: boolean) => void;
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
      space: 0,
      size: { width: 400, height: 500 },
      coordinates: { x: 20, y: 20 },
      alwaysOnDisplay: false,
      chatOnlyDisplay: false,
      userNameDisplay: true,
      userIconDisplay: true,
      reactionButtonDisplay: true,
      setBgColor: (bgColor) => set(() => ({ bgColor })),
      setFontColor: (fontColor) => set(() => ({ fontColor })),
      setFontFamily: (fontFamily) => set(() => ({ fontFamily })),
      setFontSize: (fontSize) => set(() => ({ fontSize })),
      setBlur: (blur) => set(() => ({ blur })),
      setSpace: (space) => set(() => ({ space })),
      setSize: (size) => {
        set(() => ({
          size: {
            width: size.width < 300 ? 300 : size.width,
            height: size.height < 350 ? 350 : size.height,
          },
        }));
      },
      setCoordinates: (coordinates) => set(() => ({ coordinates })),
      setDefaultPosition: () =>
        set(() => ({ size: { width: 400, height: 500 }, coordinates: { x: 20, y: 20 } })),
      setAlwaysOnDisplay: (alwaysOnDisplay) => set(() => ({ alwaysOnDisplay })),
      setChatOnlyDisplay: (chatOnlyDisplay) => set(() => ({ chatOnlyDisplay })),
      setUserNameDisplay: (userNameDisplay) => set(() => ({ userNameDisplay })),
      setUserIconDisplay: (userIconDisplay) => set(() => ({ userIconDisplay })),
      setReactionButtonDisplay: (reactionButtonDisplay) => set(() => ({ reactionButtonDisplay })),
    }),
    {
      name: 'ytdLiveChatStore',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export default useYTDLiveChatStore;
