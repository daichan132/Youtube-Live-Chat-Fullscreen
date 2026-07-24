import type { Coordinates } from '@dnd-kit/core/dist/types'
import { localStorage } from 'redux-persist-webextension-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DefaultCoordinates, DefaultSize } from '@/shared/constants'
import { normalizePersistedYTDLiveChatState, normalizeStoredGeometry, normalizeStyle } from '@/shared/settings/normalizeSettings'
import { YTD_LIVE_CHAT_PERSIST } from '@/shared/settings/persistConfig'
import i18n from '../i18n/config'
import type { sizeType, YLCStyleType, YLCStyleUpdateType } from '../types/ytdLiveChatType'
import {
  ylcCompactSetting,
  ylcDarkSetting,
  ylcInitSetting,
  ylcNeonSetting,
  ylcReadableSetting,
  ylcSimpleSetting,
  ylcTransparentSetting,
} from '../utils'

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

const DEFAULT_PRESETS = [
  { id: 'default1', titleKey: 'content.preset.defaultTitle', style: ylcInitSetting },
  { id: 'default2', titleKey: 'content.preset.transparentTitle', style: ylcTransparentSetting },
  { id: 'default3', titleKey: 'content.preset.simpleTitle', style: ylcSimpleSetting },
  { id: 'default4', titleKey: 'content.preset.darkTitle', style: ylcDarkSetting },
  { id: 'default5', titleKey: 'content.preset.readableTitle', style: ylcReadableSetting },
  { id: 'default6', titleKey: 'content.preset.compactTitle', style: ylcCompactSetting },
  { id: 'default7', titleKey: 'content.preset.neonTitle', style: ylcNeonSetting },
] as const

const DEFAULT_PRESET_TITLE_KEYS = Object.fromEntries(DEFAULT_PRESETS.map(preset => [preset.id, preset.titleKey])) as Record<
  DefaultPresetId,
  DefaultPresetTitleKey
>

const DEFAULT_PRESET_STYLES = Object.fromEntries(DEFAULT_PRESETS.map(preset => [preset.id, preset.style])) as Record<
  DefaultPresetId,
  YLCStyleType
>

type DefaultPreset = (typeof DEFAULT_PRESETS)[number]
type DefaultPresetId = DefaultPreset['id']
type DefaultPresetTitleKey = DefaultPreset['titleKey']
const NEW_DEFAULT_PRESET_IDS = new Set<DefaultPresetId>(['default4', 'default5', 'default6', 'default7'])
const LEGACY_DEFAULT_PRESET_IDS = new Set<DefaultPresetId>(['default1', 'default2', 'default3'])

const getDefaultPresetTitleKey = (id: string) => {
  if (!(id in DEFAULT_PRESET_TITLE_KEYS)) return undefined
  return DEFAULT_PRESET_TITLE_KEYS[id as DefaultPresetId]
}

const translateDefaultPresetTitle = (id: DefaultPresetId) => i18n.t(DEFAULT_PRESET_TITLE_KEYS[id])

const getDefaultPresetIds = () => DEFAULT_PRESETS.map(preset => preset.id)

const getDefaultPresetStyles = () =>
  Object.fromEntries(DEFAULT_PRESETS.map(preset => [preset.id, preset.style])) as YTDLiveChatStoreState['presetItemStyles']

const getDefaultPresetTitles = () =>
  Object.fromEntries(
    DEFAULT_PRESETS.map(preset => [preset.id, translateDefaultPresetTitle(preset.id)]),
  ) as YTDLiveChatStoreState['presetItemTitles']

const migrateDefaultPresets = (state: PersistedYTDLiveChatState): PersistedYTDLiveChatState => {
  const hasPersistedPresetIds = Array.isArray(state.presetItemIds)
  const presetItemIds = hasPersistedPresetIds ? [...(state.presetItemIds as string[])] : getDefaultPresetIds()
  const presetItemStyles = state.presetItemStyles && typeof state.presetItemStyles === 'object' ? { ...state.presetItemStyles } : {}
  const presetItemTitles = state.presetItemTitles && typeof state.presetItemTitles === 'object' ? { ...state.presetItemTitles } : {}
  const shouldAddNewDefaults = !hasPersistedPresetIds || presetItemIds.some(id => LEGACY_DEFAULT_PRESET_IDS.has(id as DefaultPresetId))

  for (const preset of DEFAULT_PRESETS) {
    const shouldKeepDefaultPreset =
      !hasPersistedPresetIds || presetItemIds.includes(preset.id) || (shouldAddNewDefaults && NEW_DEFAULT_PRESET_IDS.has(preset.id))
    if (!shouldKeepDefaultPreset) continue

    if (!presetItemIds.includes(preset.id)) {
      presetItemIds.push(preset.id)
    }
    presetItemStyles[preset.id] = DEFAULT_PRESET_STYLES[preset.id]
    presetItemTitles[preset.id] = translateDefaultPresetTitle(preset.id)
  }

  return {
    ...state,
    presetItemIds,
    presetItemStyles,
    presetItemTitles,
  }
}

const migratePersistedState = (persistedState: unknown): PersistedYTDLiveChatState => {
  const stateWithCurrentBuiltIns = migrateDefaultPresets(
    persistedState && typeof persistedState === 'object' ? (persistedState as PersistedYTDLiveChatState) : {},
  )
  return migrateDefaultPresets(normalizePersistedYTDLiveChatState(stateWithCurrentBuiltIns) as PersistedYTDLiveChatState)
}

export const useYTDLiveChatStore = create<YTDLiveChatStoreState>()(
  persist(
    set => ({
      coordinates: { ...DefaultCoordinates },
      size: { ...DefaultSize },
      presetItemIds: getDefaultPresetIds(),
      presetItemStyles: getDefaultPresetStyles(),
      presetItemTitles: getDefaultPresetTitles(),
      addPresetEnabled: true,
      ...ylcInitSetting,
      addPresetItem: (id, title, ylcStyle) =>
        set(state => ({
          addPresetEnabled: false,
          presetItemStyles: { ...state.presetItemStyles, [id]: normalizeStyle(ylcStyle) },
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
        set(state => ({
          ...normalizeStyle({ ...state, ...YLCStyleUpdate }),
          addPresetEnabled: true,
        })),
      setPresetItemIds: presetItemIds => set(() => ({ presetItemIds })),
      setAddPresetEnabled: addPresetEnabled => set(() => ({ addPresetEnabled })),
      setSize: size =>
        set(state => ({
          size: normalizeStoredGeometry({ coordinates: state.coordinates, size }, { coordinates: state.coordinates, size: state.size })
            .size,
        })),
      setCoordinates: coordinates =>
        set(state => ({
          coordinates: normalizeStoredGeometry({ coordinates, size: state.size }, { coordinates: state.coordinates, size: state.size })
            .coordinates,
        })),
      setGeometry: geometry =>
        set(state =>
          normalizeStoredGeometry(geometry, {
            coordinates: state.coordinates,
            size: state.size,
          }),
        ),
      setDefaultPosition: () =>
        set(() => ({
          size: { ...DefaultSize },
          coordinates: { ...DefaultCoordinates },
        })),
    }),
    {
      name: YTD_LIVE_CHAT_PERSIST.key,
      version: YTD_LIVE_CHAT_PERSIST.version,
      migrate: persistedState => migratePersistedState(persistedState),
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

export const getPresetTitleFallbackKey = getDefaultPresetTitleKey
