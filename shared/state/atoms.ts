import { atom } from 'jotai'
import type { LocaleMessages, LocaleState, TranslationKey } from '@/shared/i18n/generated/translationTypes'
import { DEFAULT_LANGUAGE } from '@/shared/i18n/language'
import { isRTL } from '@/shared/i18n/rtl'
import type { NormalizedSettingsBackup } from '@/shared/settings/backup'
import { areChatAppearanceSettingsEqual, areChatGeometriesEqual, areChatProfilesEqual } from '@/shared/settings/equality'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { ChatGeometry, ChatProfile, ChatSettings, GlobalSettings, PresetEntry } from '@/shared/settings/model'
import { normalizeChatSettings } from '@/shared/settings/normalizeSettings'
import type { ChatAppearanceSettings, PersistenceStatus } from '@/shared/settings/repository'

export type EditorSession = {
  draftProfile: ChatProfile | null
  past: ChatProfile[]
  future: ChatProfile[]
  activeGesture: { id: string; before: ChatProfile } | null
}

export const EMPTY_MESSAGES = {} as LocaleMessages

export const globalSettingsStateAtom = atom<GlobalSettings>({
  ytdLiveChat: true,
  themeMode: 'system',
})

export const chatSettingsStateAtom = atom<ChatSettings>(normalizeChatSettings(DEFAULT_CHAT_SETTINGS, DEFAULT_CHAT_SETTINGS))

export const editorSessionStateAtom = atom<EditorSession>({
  draftProfile: null,
  past: [],
  future: [],
  activeGesture: null,
})

export const localeStateAtom = atom<LocaleState>({
  code: DEFAULT_LANGUAGE,
  direction: 'ltr',
  messages: EMPTY_MESSAGES,
})

export const persistenceStatusAtom = atom<PersistenceStatus>({ status: 'idle', failedDomains: [] })

export const themeModeAtom = atom(get => get(globalSettingsStateAtom).themeMode)
export const ytdLiveChatEnabledAtom = atom(get => get(globalSettingsStateAtom).ytdLiveChat)
export const profileAtom = atom(get => get(chatSettingsStateAtom).profile)
export const geometryAtom = atom(get => get(chatSettingsStateAtom).geometry)
export const presetsAtom = atom(get => get(chatSettingsStateAtom).presets)
export const effectiveProfileAtom = atom(get => get(editorSessionStateAtom).draftProfile ?? get(chatSettingsStateAtom).profile)
export const canUndoAtom = atom(get => get(editorSessionStateAtom).past.length > 0)
export const canRedoAtom = atom(get => get(editorSessionStateAtom).future.length > 0)
export const localeCodeAtom = atom(get => get(localeStateAtom).code)
export const localeDirectionAtom = atom(get => get(localeStateAtom).direction)
export const translatorAtom = atom(get => {
  const messages = get(localeStateAtom).messages
  return (key: TranslationKey) => messages[key] ?? key
})

export type AppHydration = {
  global: GlobalSettings
  chat: ChatSettings
  locale: LocaleState
}

export const hydrateAppAtom = atom(null, (_get, set, snapshot: AppHydration) => {
  set(globalSettingsStateAtom, {
    ytdLiveChat: snapshot.global.ytdLiveChat,
    themeMode: snapshot.global.themeMode,
  })
  set(chatSettingsStateAtom, normalizeChatSettings(snapshot.chat, DEFAULT_CHAT_SETTINGS))
  set(localeStateAtom, snapshot.locale)
  set(editorSessionStateAtom, { draftProfile: null, past: [], future: [], activeGesture: null })
})

export const replaceLocaleAtom = atom(null, (_get, set, locale: LocaleState) => {
  set(localeStateAtom, locale)
})

export const replaceImportedSettingsAtom = atom(
  null,
  (_get, set, input: Pick<NormalizedSettingsBackup, 'globalSetting' | 'chatSettings'>) => {
    set(globalSettingsStateAtom, input.globalSetting)
    set(chatSettingsStateAtom, input.chatSettings)
    set(editorSessionStateAtom, { draftProfile: null, past: [], future: [], activeGesture: null })
  },
)

export const replaceExternalGlobalSettingsAtom = atom(null, (_get, set, next: GlobalSettings) => {
  set(globalSettingsStateAtom, next)
})

export const replaceExternalEnabledAtom = atom(null, (get, set, enabled: boolean) => {
  const current = get(globalSettingsStateAtom)
  if (current.ytdLiveChat !== enabled) set(globalSettingsStateAtom, { ...current, ytdLiveChat: enabled })
})

export const replaceExternalThemeAtom = atom(null, (get, set, themeMode: GlobalSettings['themeMode']) => {
  const current = get(globalSettingsStateAtom)
  if (current.themeMode !== themeMode) set(globalSettingsStateAtom, { ...current, themeMode })
})

export const replaceExternalAppearanceAtom = atom(null, (get, set, next: ChatAppearanceSettings) => {
  const current = get(chatSettingsStateAtom)
  // A successful local save is read back through this same path. An
  // acknowledgement of the committed value must not cancel the NEXT gesture.
  if (areChatAppearanceSettingsEqual(current, next)) return
  const profileChanged = !areChatProfilesEqual(current.profile, next.profile)
  set(chatSettingsStateAtom, { ...current, profile: profileChanged ? next.profile : current.profile, presets: next.presets })
  // Preset-only updates do not conflict with a draft of the current profile.
  if (profileChanged) {
    set(editorSessionStateAtom, { draftProfile: null, past: [], future: [], activeGesture: null })
  }
})

export const replaceExternalGeometryAtom = atom(null, (get, set, geometry: ChatGeometry) => {
  const current = get(chatSettingsStateAtom)
  if (!areChatGeometriesEqual(current.geometry, geometry)) set(chatSettingsStateAtom, { ...current, geometry })
})

export const replacePersistenceStatusAtom = atom(null, (_get, set, status: PersistenceStatus) => {
  set(persistenceStatusAtom, status)
})

export const replaceExternalChatSettingsAtom = atom(null, (_get, set, next: ChatSettings) => {
  set(replaceExternalAppearanceAtom, next)
  set(replaceExternalGeometryAtom, next.geometry)
})

export const replaceExternalLocaleAtom = atom(null, (_get, set, locale: LocaleState) => {
  set(localeStateAtom, locale)
})

export const localeStateFromMessages = (code: LocaleState['code'], messages: LocaleMessages): LocaleState => ({
  code,
  direction: isRTL(code) ? 'rtl' : 'ltr',
  messages,
})

export type StateSnapshot = {
  global: GlobalSettings
  chat: ChatSettings
  locale: LocaleState
}

export type { ChatGeometry, ChatProfile, GlobalSettings, PresetEntry }
