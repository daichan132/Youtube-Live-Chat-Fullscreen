import { localStorage } from 'redux-persist-webextension-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { ylcInitSetting, type YLCStyleType, type sizeType } from '../utils';

import type { Coordinates } from '@dnd-kit/core/dist/types';
import type { RGBColor } from 'react-color';

type YTDLiveChatStoreState = {
  presetItemIds: string[];
  presetItemStyles: { [key: string]: { title: string; ylcStyle: YLCStyleType } };
  addPresetItem: (id: string, title: string, ylcStyle: YLCStyleType) => void;
  deletePresetItem: (id: string) => void;
  updateTitle: (id: string, title: string) => void;
  setPresetItemIds: (presetItemIds: string[]) => void;
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
} & YLCStyleType;

export const useYTDLiveChatStore = create<YTDLiveChatStoreState>()(
  immer(
    persist(
      (set) => ({
        presetItemIds: ['default1', 'default2', 'default3'],
        presetItemStyles: {
          default1: {
            title: 'default1',
            ylcStyle: ylcInitSetting,
          },
          default2: {
            title: 'default2',
            ylcStyle: ylcInitSetting,
          },
          default3: {
            title: 'default3',
            ylcStyle: ylcInitSetting,
          },
        },
        ...ylcInitSetting,
        addPresetItem: (id, title, ylcStyle) =>
          set((state) => {
            state.presetItemStyles[id] = { title, ylcStyle };
            state.presetItemIds.push(id);
          }),
        deletePresetItem: (id) =>
          set((state) => {
            delete state.presetItemStyles[id];
            state.presetItemIds = state.presetItemIds.filter((item) => item !== id);
          }),
        updateTitle: (id, title) => set((state) => void (state.presetItemStyles[id].title = title)),
        setPresetItemIds: (presetItemIds) => set(() => ({ presetItemIds })),
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
  ),
);

export default useYTDLiveChatStore;
