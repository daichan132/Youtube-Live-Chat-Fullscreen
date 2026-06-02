import type { Coordinates } from '@dnd-kit/core/dist/types'
import { localStorage } from 'redux-persist-webextension-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DefaultCoordinates, DefaultSize, ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'
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

const DEFAULT_PRESET_TITLE_KEYS = {
  default1: 'content.preset.defaultTitle',
  default2: 'content.preset.transparentTitle',
  default3: 'content.preset.simpleTitle',
} as const

const getDefaultPresetTitleKey = (id: string) => {
  if (!(id in DEFAULT_PRESET_TITLE_KEYS)) return undefined
  return DEFAULT_PRESET_TITLE_KEYS[id as keyof typeof DEFAULT_PRESET_TITLE_KEYS]
}

const translateDefaultPresetTitle = (id: keyof typeof DEFAULT_PRESET_TITLE_KEYS) => i18n.t(DEFAULT_PRESET_TITLE_KEYS[id])

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

const clampSize = (size: sizeType): sizeType => ({
  width: Math.max(size.width, ResizableMinWidth),
  height: Math.max(size.height, ResizableMinHeight),
})

const migratePresetItemTitles = (titles: unknown): YTDLiveChatStoreState['presetItemTitles'] | undefined => {
  if (!titles || typeof titles !== 'object') return undefined

  const migratedTitles = { ...(titles as Record<string, string>) }
  for (const id of Object.keys(DEFAULT_PRESET_TITLE_KEYS) as Array<keyof typeof DEFAULT_PRESET_TITLE_KEYS>) {
    if (typeof migratedTitles[id] !== 'string' || migratedTitles[id].trim().length === 0) {
      migratedTitles[id] = translateDefaultPresetTitle(id)
    }
  }

  return migratedTitles
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

  const migratedTitles = migratePresetItemTitles(state.presetItemTitles)
  if (migratedTitles) {
    migratedState.presetItemTitles = migratedTitles
  }

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
  persist(
    set => ({
      coordinates: { ...DefaultCoordinates },
      size: { ...DefaultSize },
      presetItemIds: ['default1', 'default2', 'default3'],
      presetItemStyles: {
        default1: ylcInitSetting,
        default2: ylcTransparentSetting,
        default3: ylcSimpleSetting,
      },
      presetItemTitles: {
        default1: translateDefaultPresetTitle('default1'),
        default2: translateDefaultPresetTitle('default2'),
        default3: translateDefaultPresetTitle('default3'),
      },
      addPresetEnabled: true,
      ...ylcInitSetting,
      addPresetItem: (id, title, ylcStyle) =>
        set(state => ({
          addPresetEnabled: false,
          presetItemStyles: { ...state.presetItemStyles, [id]: sanitizeStyleForPreset(ylcStyle) },
          presetItemTitles: { ...state.presetItemTitles, [id]: title },
          presetItemIds: [...state.presetItemIds, id],
        })),
      deletePresetItem: id =>
        set(state => {
          const { [id]: _style, ...restStyles } = state.presetItemStyles
          const { [id]: _title, ...restTitles } = state.presetItemTitles
          return {
            presetItemStyles: restStyles,
            presetItemTitles: restTitles,
            presetItemIds: state.presetItemIds.filter(item => item !== id),
          }
        }),
      updateTitle: (id, title) =>
        set(state => ({
          presetItemTitles: { ...state.presetItemTitles, [id]: title },
        })),
      updateYLCStyle: YLCStyleUpdate =>
        set(() => ({
          ...sanitizeStyleUpdate(YLCStyleUpdate),
          addPresetEnabled: true,
        })),
      setPresetItemIds: presetItemIds => set(() => ({ presetItemIds })),
      setAddPresetEnabled: addPresetEnabled => set(() => ({ addPresetEnabled })),
      setSize: size => set(() => ({ size: clampSize(size) })),
      setCoordinates: coordinates => set(() => ({ coordinates })),
      setGeometry: geometry =>
        set(() => ({
          coordinates: geometry.coordinates,
          size: clampSize(geometry.size),
        })),
      setDefaultPosition: () =>
        set(() => ({
          size: { ...DefaultSize },
          coordinates: { ...DefaultCoordinates },
        })),
    }),
    {
      name: 'ytdLiveChatStore',
      version: 2,
      migrate: persistedState => migratePersistedState(persistedState),
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

export const getPresetTitleFallbackKey = getDefaultPresetTitleKey
