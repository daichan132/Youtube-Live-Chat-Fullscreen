import { storage } from 'wxt/utils/storage'
import type { LocaleCode } from '@/shared/i18n/language'
import type { ChatGeometry, ChatSettings, GlobalSettings } from './model'
import { isRecord, normalizeChatProfile, normalizePresets } from './normalizeSettings'
import {
  APPEARANCE_STORAGE_KEY,
  ENABLED_STORAGE_KEY,
  GEOMETRY_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from './storageKeys'

export { DEFAULT_GLOBAL_SETTINGS } from './defaults'

export type StoredEnvelope<T> = {
  schemaVersion: 1
  writerId: string
  value: T
}

export type ChatAppearanceSettings = Pick<ChatSettings, 'profile' | 'presets'>

export type SettingsSnapshot = {
  global: GlobalSettings
  chat: ChatSettings
  locale: LocaleCode
}

export type SettingsDomainValues = {
  enabled: boolean
  theme: GlobalSettings['themeMode']
  appearance: ChatAppearanceSettings
  geometry: ChatGeometry
  locale: LocaleCode
}

export type PersistenceDomain = keyof SettingsDomainValues

export const PERSISTENCE_DOMAINS = ['enabled', 'theme', 'appearance', 'geometry', 'locale'] as const satisfies readonly PersistenceDomain[]

export const localKey = <T extends string>(key: T) => `local:${key}` as const

export const settingsItems = {
  enabled: storage.defineItem<StoredEnvelope<SettingsDomainValues['enabled']>>(localKey(ENABLED_STORAGE_KEY)),
  theme: storage.defineItem<StoredEnvelope<SettingsDomainValues['theme']>>(localKey(THEME_STORAGE_KEY)),
  appearance: storage.defineItem<StoredEnvelope<SettingsDomainValues['appearance']>>(localKey(APPEARANCE_STORAGE_KEY)),
  geometry: storage.defineItem<StoredEnvelope<SettingsDomainValues['geometry']>>(localKey(GEOMETRY_STORAGE_KEY)),
  locale: storage.defineItem<StoredEnvelope<SettingsDomainValues['locale']>>(localKey(LOCALE_STORAGE_KEY)),
} satisfies Record<PersistenceDomain, unknown>

// Only the envelope is known here. Each domain still validates its value.
export const isStoredEnvelope = (value: unknown): value is StoredEnvelope<unknown> =>
  isRecord(value) && value.schemaVersion === 1 && typeof value.writerId === 'string' && 'value' in value

export const normalizeTheme = (input: unknown, fallback: GlobalSettings['themeMode']): GlobalSettings['themeMode'] =>
  input === 'light' || input === 'dark' || input === 'system' ? input : fallback

export const normalizeAppearance = (input: unknown, fallback: ChatAppearanceSettings): ChatAppearanceSettings => {
  const raw = isRecord(input) ? input : {}
  return {
    profile: normalizeChatProfile(raw.profile, fallback.profile),
    presets: normalizePresets(raw.presets, fallback.presets),
  }
}
