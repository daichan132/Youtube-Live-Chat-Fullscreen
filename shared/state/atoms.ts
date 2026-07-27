import { atom } from 'jotai'
import type { LocaleMessages, LocaleState } from '@/shared/i18n/generated/translationTypes'
import { DEFAULT_LANGUAGE } from '@/shared/i18n/language'
import { isRTL } from '@/shared/i18n/rtl'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { ChatGeometry, ChatProfile, ChatSettings, PresetEntry } from '@/shared/settings/model'
import { normalizeChatSettings, normalizeGlobalSetting } from '@/shared/settings/normalizeSettings'
import type { ThemeMode } from '@/shared/theme'

export type GlobalSettings = {
  ytdLiveChat: boolean
  themeMode: ThemeMode
}

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
  return (key: string) => messages[key as keyof LocaleMessages] ?? key
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
  (get, set, input: { globalSetting: Record<string, unknown>; chatSettings: ChatSettings }) => {
    const currentGlobal = get(globalSettingsStateAtom)
    const global = normalizeGlobalSetting({ ...currentGlobal, ...input.globalSetting })
    set(globalSettingsStateAtom, {
      ytdLiveChat: global.ytdLiveChat ?? currentGlobal.ytdLiveChat,
      themeMode: global.themeMode ?? currentGlobal.themeMode,
    })
    set(chatSettingsStateAtom, normalizeChatSettings(input.chatSettings, get(chatSettingsStateAtom)))
    set(editorSessionStateAtom, { draftProfile: null, past: [], future: [], activeGesture: null })
  },
)

export const replaceExternalGlobalSettingsAtom = atom(null, (_get, set, next: GlobalSettings) => {
  set(globalSettingsStateAtom, next)
})

export const replaceExternalChatSettingsAtom = atom(null, (get, set, next: ChatSettings) => {
  const current = get(chatSettingsStateAtom)
  const editor = get(editorSessionStateAtom)
  set(chatSettingsStateAtom, next)
  if (editor.activeGesture || editor.draftProfile || JSON.stringify(current.profile) !== JSON.stringify(next.profile)) {
    set(editorSessionStateAtom, { draftProfile: null, past: [], future: [], activeGesture: null })
  }
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

export type { ChatGeometry, ChatProfile, PresetEntry }
