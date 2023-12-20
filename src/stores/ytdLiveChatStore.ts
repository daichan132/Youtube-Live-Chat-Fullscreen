import { localStorage } from 'redux-persist-webextension-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { ylcInitSetting } from '../utils';

import type { YLCStyleType, YLCStyleUpdateType, sizeType } from '../types/ytdLiveChatType';
import type { Coordinates } from '@dnd-kit/core/dist/types';

type YTDLiveChatStoreState = {
  presetItemIds: string[];
  presetItemStyles: { [key: string]: { title: string; ylcStyle: YLCStyleType } };
  coordinates: Coordinates;
  size: sizeType;
  addPresetItem: (id: string, title: string, ylcStyle: YLCStyleType) => void;
  deletePresetItem: (id: string) => void;
  updateTitle: (id: string, title: string) => void;
  updateYLCStyleUpdate: (YLCStyleUpdate: YLCStyleUpdateType) => void;
  setPresetItemIds: (presetItemIds: string[]) => void;
  setSize: (size: sizeType) => void;
  setCoordinates: (coordinates: Coordinates) => void;
  setDefaultPosition: () => void;
} & YLCStyleType;

export const useYTDLiveChatStore = create<YTDLiveChatStoreState>()(
  immer(
    persist(
      (set) => ({
        coordinates: { x: 20, y: 20 },
        size: { width: 400, height: 500 },
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
        updateTitle: (id, title) => set((state) => (state.presetItemStyles[id].title = title)),
        updateYLCStyleUpdate: (YLCStyleUpdate) => set((state) => ({ ...state, ...YLCStyleUpdate })),
        setPresetItemIds: (presetItemIds) => set(() => ({ presetItemIds })),
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
      }),
      {
        name: 'ytdLiveChatStore',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  ),
);

export default useYTDLiveChatStore;
