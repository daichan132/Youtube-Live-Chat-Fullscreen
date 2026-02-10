import type { Coordinates } from '@dnd-kit/core/dist/types'
import { localStorage } from 'redux-persist-webextension-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'
import i18n from '../i18n/config'
import type { sizeType, YLCStyleType, YLCStyleUpdateType } from '../types/ytdLiveChatType'
import { ylcInitSetting, ylcSimpleSetting, ylcTransparentSetting } from '../utils'
import { normalizeFontFamily } from '../utils/fontFamilyPolicy'

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
  setGeometry: (geometry: { coordinates: Coordinates; size: sizeType }) => void
  setDefaultPosition: () => void
} & YLCStyleType

type PersistedYTDLiveChatState = Partial<
  Pick<
    YTDLiveChatStoreState,
    'coordinates' | 'size' | 'presetItemIds' | 'presetItemStyles' | 'presetItemTitles' | 'addPresetEnabled' | keyof YLCStyleType
  >
> & {
  reactionButtonDisplay?: boolean
}

const removeLegacyReactionButtonDisplay = (style: Record<string, unknown>) => {
  if (!('reactionButtonDisplay' in style)) {
    return style
  }

  // Legacy persisted stores may contain the removed key.
  const { reactionButtonDisplay: _removed, ...rest } = style
  return rest
}

const sanitizeFontFamilyInStyleObject = (style: Record<string, unknown>) => ({
  ...style,
  fontFamily: normalizeFontFamily(style.fontFamily),
})

const sanitizeStyleForPreset = (style: YLCStyleType): YLCStyleType => ({
  ...style,
  fontFamily: normalizeFontFamily(style.fontFamily),
})

const sanitizeStyleUpdate = (update: YLCStyleUpdateType): YLCStyleUpdateType => {
  if (!Object.hasOwn(update, 'fontFamily')) {
    return update
  }

  return {
    ...update,
    fontFamily: normalizeFontFamily(update.fontFamily),
  }
}

const migratePersistedState = (persistedState: unknown): PersistedYTDLiveChatState => {
  if (!persistedState || typeof persistedState !== 'object') {
    return {}
  }

  const state = persistedState as Record<string, unknown>
  const { reactionButtonDisplay: _removed, presetItemStyles, ...restState } = state
  const migratedState = {
    ...restState,
  } as PersistedYTDLiveChatState

  if ('fontFamily' in state) {
    migratedState.fontFamily = normalizeFontFamily(state.fontFamily)
  }

  if (!presetItemStyles || typeof presetItemStyles !== 'object') {
    return migratedState
  }

  const migratedPresetItemStyles = Object.fromEntries(
    Object.entries(presetItemStyles).map(([id, style]) => {
      if (!style || typeof style !== 'object') {
        return [id, style]
      }
      const styleWithoutLegacyField = removeLegacyReactionButtonDisplay(style as Record<string, unknown>)
      return [id, sanitizeFontFamilyInStyleObject(styleWithoutLegacyField)]
    }),
  )

  return {
    ...migratedState,
    presetItemStyles: migratedPresetItemStyles,
  } as PersistedYTDLiveChatState
}

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
            state.presetItemStyles[id] = sanitizeStyleForPreset(ylcStyle)
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
            ...sanitizeStyleUpdate(YLCStyleUpdate),
            addPresetEnabled: true,
          })),
        setPresetItemIds: presetItemIds => set(() => ({ presetItemIds })),
        setAddPresetEnabled: addPresetEnabled => set(() => ({ addPresetEnabled })),
        setSize: size =>
          set(() => ({
            size: {
              width: size.width < ResizableMinWidth ? ResizableMinWidth : size.width,
              height: size.height < ResizableMinHeight ? ResizableMinHeight : size.height,
            },
          })),
        setCoordinates: coordinates => set(() => ({ coordinates })),
        setGeometry: geometry =>
          set(() => ({
            coordinates: geometry.coordinates,
            size: {
              width: geometry.size.width < ResizableMinWidth ? ResizableMinWidth : geometry.size.width,
              height: geometry.size.height < ResizableMinHeight ? ResizableMinHeight : geometry.size.height,
            },
          })),
        setDefaultPosition: () =>
          set(() => ({
            size: { width: 400, height: 400 },
            coordinates: { x: 20, y: 20 },
          })),
      }),
      {
        name: 'ytdLiveChatStore',
        version: 2,
        migrate: persistedState => migratePersistedState(persistedState),
        storage: createJSONStorage(() => localStorage),
      },
    ),
  ),
)

export default useYTDLiveChatStore
