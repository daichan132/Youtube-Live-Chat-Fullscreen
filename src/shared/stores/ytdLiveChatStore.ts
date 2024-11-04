import { localStorage } from 'redux-persist-webextension-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import i18n from '../i18n/config'
import { ylcInitSetting, ylcSimpleSetting, ylcTransparentSetting } from '../utils'

import { ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'
import type { Coordinates } from '@dnd-kit/core/dist/types'
import type { YLCStyleType, YLCStyleUpdateType, sizeType } from '../types/ytdLiveChatType'
type YTDLiveChatStoreState = {
  presetItemIds: string[]
  presetItemStyles: { [key: string]: YLCStyleType }
  presetItemTitles: { [key: string]: string }
  addPresetEnabled: boolean
  coordinates: Coordinates
  size: sizeType
  addPresetItem: (id: string, title: string, ylcStyle: YLCStyleType) => void
  deletePresetItem: (id: string) => void
  updateTitle: (id: string, title: string) => void
  updateYLCStyle: (YLCStyleUpdate: YLCStyleUpdateType) => void
  setPresetItemIds: (presetItemIds: string[]) => void
  setAddPresetEnabled: (addPresetEnabled: boolean) => void
  setSize: (size: sizeType) => void
  setCoordinates: (coordinates: Coordinates) => void
  setDefaultPosition: () => void
} & YLCStyleType

export const useYTDLiveChatStore = create<YTDLiveChatStoreState>()(
  immer(
    persist(
      set => ({
        coordinates: { x: 20, y: 20 },
        size: { width: 400, height: 400 },
        presetItemIds: ['default1', 'default2', 'default3'],
        presetItemStyles: {
          default1: ylcInitSetting,
          default2: ylcTransparentSetting,
          default3: ylcSimpleSetting,
        },
        presetItemTitles: {
          default1: i18n.t('content.preset.defaultTitle'), // i18nキーを使う
          default2: i18n.t('content.preset.transparentTitle'),
          default3: i18n.t('content.preset.simpleTitle'),
        },
        addPresetEnabled: true,
        ...ylcInitSetting,
        addPresetItem: (id, title, ylcStyle) =>
          set(state => {
            state.addPresetEnabled = false
            state.presetItemStyles[id] = ylcStyle
            state.presetItemTitles[id] = title
            state.presetItemIds.push(id)
          }),
        deletePresetItem: id =>
          set(state => {
            delete state.presetItemStyles[id]
            delete state.presetItemTitles[id]
            state.presetItemIds = state.presetItemIds.filter(item => item !== id)
          }),
        updateTitle: (id, title) =>
          set(state => ({
            ...state,
            presetItemTitles: { ...state.presetItemTitles, [id]: title },
          })),
        updateYLCStyle: YLCStyleUpdate =>
          set(state => ({
            ...state,
            ...YLCStyleUpdate,
            addPresetEnabled: true,
          })),
        setPresetItemIds: presetItemIds => set(() => ({ presetItemIds })),
        setAddPresetEnabled: addPresetEnabled => set(() => ({ addPresetEnabled })),
        setSize: size => {
          set(() => ({
            size: {
              width: size.width < ResizableMinWidth ? ResizableMinWidth : size.width,
              height: size.height < ResizableMinHeight ? ResizableMinHeight : size.height,
            },
          }))
        },
        setCoordinates: coordinates => set(() => ({ coordinates })),
        setDefaultPosition: () =>
          set(() => ({
            size: { width: 400, height: 400 },
            coordinates: { x: 20, y: 20 },
          })),
      }),
      {
        name: 'ytdLiveChatStore',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  ),
)

export default useYTDLiveChatStore
