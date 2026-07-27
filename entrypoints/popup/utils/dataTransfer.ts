import type { Store } from 'jotai/vanilla/store'
import { buildSettingsBackup, normalizeSettingsBackup, type SettingsBackup } from '@/shared/settings/backup'
import { normalizeChatSettings, normalizeGlobalSetting } from '@/shared/settings/normalizeSettings'
import { chatSettingsStateAtom, globalSettingsStateAtom } from '@/shared/state/atoms'

export type ExportData = SettingsBackup

export const currentSettings = (store: Store) => ({
  globalSetting: store.get(globalSettingsStateAtom),
  chatSettings: store.get(chatSettingsStateAtom),
})

export const isValidImportData = (store: Store, data: unknown): boolean => normalizeSettingsBackup(data, currentSettings(store)) !== null

export const buildExportData = (store: Store): ExportData => buildSettingsBackup(currentSettings(store))

export const sanitizeGlobalSetting = (input: Record<string, unknown>) => normalizeGlobalSetting(input)
export const sanitizeChatSettings = (store: Store, input: Record<string, unknown>) =>
  normalizeChatSettings(input, currentSettings(store).chatSettings)

export const normalizeImport = (store: Store, input: unknown) => {
  const normalized = normalizeSettingsBackup(input, currentSettings(store))
  if (!normalized) throw new Error('Unsupported settings backup')
  return normalized
}
