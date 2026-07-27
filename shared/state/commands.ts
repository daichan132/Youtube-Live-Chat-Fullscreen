import { atom } from 'jotai'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { ChatGeometry, ChatProfile, PresetEntry } from '@/shared/settings/model'
import { normalizeChatGeometry, normalizeChatProfile, normalizePresetEntry } from '@/shared/settings/normalizeSettings'
import { chatSettingsStateAtom, editorSessionStateAtom, type GlobalSettings, globalSettingsStateAtom, profileAtom } from './atoms'

export const HISTORY_LIMIT = 50

const profilesEqual = (left: ChatProfile, right: ChatProfile) => JSON.stringify(left) === JSON.stringify(right)

const withEditorReset = () => ({ draftProfile: null, past: [], future: [], activeGesture: null })

export const setThemeModeAtom = atom(null, (get, set, themeMode: GlobalSettings['themeMode']) => {
  const current = get(globalSettingsStateAtom)
  if (current.themeMode !== themeMode) set(globalSettingsStateAtom, { ...current, themeMode })
})

export const setYTDLiveChatEnabledAtom = atom(null, (get, set, enabled: boolean) => {
  const current = get(globalSettingsStateAtom)
  if (current.ytdLiveChat !== enabled) set(globalSettingsStateAtom, { ...current, ytdLiveChat: enabled })
})

export const commitGeometryAtom = atom(null, (get, set, input: ChatGeometry) => {
  const current = get(chatSettingsStateAtom)
  const geometry = normalizeChatGeometry(input, current.geometry)
  if (JSON.stringify(current.geometry) !== JSON.stringify(geometry)) set(chatSettingsStateAtom, { ...current, geometry })
})

export const commitProfileAtom = atom(null, (get, set, input: ChatProfile) => {
  const chat = get(chatSettingsStateAtom)
  const editor = get(editorSessionStateAtom)
  const before = normalizeChatProfile(chat.profile)
  const next = normalizeChatProfile(input, before)
  if (profilesEqual(before, next)) return false
  set(chatSettingsStateAtom, { ...chat, profile: next })
  set(editorSessionStateAtom, {
    draftProfile: null,
    past: [...editor.past, before].slice(-HISTORY_LIMIT),
    future: [],
    activeGesture: null,
  })
  return true
})

export type ChatProfilePatch = {
  appearance?: Partial<ChatProfile['appearance']>
  display?: Partial<ChatProfile['display']>
}

const applyPatch = (profile: ChatProfile, patch: ChatProfilePatch) =>
  normalizeChatProfile(
    { appearance: { ...profile.appearance, ...patch.appearance }, display: { ...profile.display, ...patch.display } },
    profile,
  )

export const beginStyleGestureAtom = atom(null, (get, set, id: string) => {
  const editor = get(editorSessionStateAtom)
  if (editor.activeGesture?.id === id) return
  const current = normalizeChatProfile(get(profileAtom))
  set(editorSessionStateAtom, {
    ...editor,
    activeGesture: { id, before: current },
    draftProfile: editor.draftProfile ?? current,
  })
})

export const previewStylePatchAtom = atom(null, (get, set, input: { id: string; patch: ChatProfilePatch }) => {
  const editor = get(editorSessionStateAtom)
  if (editor.activeGesture?.id !== input.id) set(beginStyleGestureAtom, input.id)
  const nextEditor = get(editorSessionStateAtom)
  const base = nextEditor.draftProfile ?? get(profileAtom)
  set(editorSessionStateAtom, { ...nextEditor, draftProfile: applyPatch(base, input.patch) })
})

export const finishStyleGestureAtom = atom(null, (get, set, gestureId?: string) => {
  const editor = get(editorSessionStateAtom)
  const gesture = editor.activeGesture
  if (!gesture || (gestureId !== undefined && gesture.id !== gestureId)) return false
  const draft = editor.draftProfile
  if (!draft || profilesEqual(gesture.before, draft)) {
    set(editorSessionStateAtom, { ...editor, activeGesture: null, draftProfile: null })
    return true
  }
  const chat = get(chatSettingsStateAtom)
  set(chatSettingsStateAtom, { ...chat, profile: normalizeChatProfile(draft, chat.profile) })
  set(editorSessionStateAtom, {
    draftProfile: null,
    past: [...editor.past, gesture.before].slice(-HISTORY_LIMIT),
    future: [],
    activeGesture: null,
  })
  return true
})

export const cancelStyleGestureAtom = atom(null, (_get, set) => {
  set(editorSessionStateAtom, getEditorReset())
})

const getEditorReset = () => ({ draftProfile: null, past: [], future: [], activeGesture: null })

export const commitStylePatchAtom = atom(null, (get, set, patch: ChatProfilePatch) => {
  set(finishStyleGestureAtom)
  const current = get(profileAtom)
  set(commitProfileAtom, applyPatch(current, patch))
})

export const applyPresetAtom = atom(null, (_get, set, profile: ChatProfile) => {
  set(finishStyleGestureAtom)
  set(commitProfileAtom, profile)
})

export const addPresetAtom = atom(null, (get, set, preset: PresetEntry) => {
  const normalized = normalizePresetEntry(preset)
  const current = get(chatSettingsStateAtom)
  if (!normalized || current.presets.some(entry => entry.id === normalized.id)) return
  set(chatSettingsStateAtom, { ...current, presets: [...current.presets, normalized] })
})

export const deletePresetAtom = atom(null, (get, set, id: string) => {
  const current = get(chatSettingsStateAtom)
  set(chatSettingsStateAtom, { ...current, presets: current.presets.filter(preset => preset.kind === 'builtin' || preset.id !== id) })
})

export const reorderPresetsAtom = atom(null, (get, set, ids: string[]) => {
  const current = get(chatSettingsStateAtom)
  const byId = new Map(current.presets.map(preset => [preset.id, preset]))
  const seen = new Set<string>()
  const presets = ids
    .map(id => byId.get(id))
    .filter((preset): preset is PresetEntry => {
      if (!preset || seen.has(preset.id)) return false
      seen.add(preset.id)
      return true
    })
  for (const preset of current.presets) if (!seen.has(preset.id)) presets.push(preset)
  set(chatSettingsStateAtom, { ...current, presets })
})

export const updatePresetNameAtom = atom(null, (get, set, input: { id: string; name: string }) => {
  const current = get(chatSettingsStateAtom)
  set(chatSettingsStateAtom, {
    ...current,
    presets: current.presets.map(preset =>
      preset.kind === 'custom' && preset.id === input.id ? { ...preset, name: input.name.slice(0, 100) } : preset,
    ),
  })
})

export const resetGeometryAtom = atom(null, (get, set) => {
  set(chatSettingsStateAtom, { ...get(chatSettingsStateAtom), geometry: normalizeChatGeometry(DEFAULT_CHAT_SETTINGS.geometry) })
})

export const undoStyleAtom = atom(null, (get, set) => {
  set(finishStyleGestureAtom)
  const editor = get(editorSessionStateAtom)
  const current = get(profileAtom)
  const target = editor.past.at(-1)
  if (!target) return false
  set(chatSettingsStateAtom, { ...get(chatSettingsStateAtom), profile: target })
  set(editorSessionStateAtom, {
    draftProfile: null,
    past: editor.past.slice(0, -1),
    future: [current, ...editor.future],
    activeGesture: null,
  })
  return true
})

export const redoStyleAtom = atom(null, (get, set) => {
  set(finishStyleGestureAtom)
  const editor = get(editorSessionStateAtom)
  const current = get(profileAtom)
  const target = editor.future[0]
  if (!target) return false
  set(chatSettingsStateAtom, { ...get(chatSettingsStateAtom), profile: target })
  set(editorSessionStateAtom, {
    draftProfile: null,
    past: [...editor.past, current].slice(-HISTORY_LIMIT),
    future: editor.future.slice(1),
    activeGesture: null,
  })
  return true
})

export const clearStyleHistoryAtom = atom(null, (_get, set) => set(editorSessionStateAtom, withEditorReset()))
