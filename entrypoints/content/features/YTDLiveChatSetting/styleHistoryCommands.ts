import { useStore } from 'jotai'
import type { Store } from 'jotai/vanilla/store'
import { useMemo } from 'react'
import type { ChatAppearance, ChatDisplay, ChatProfile } from '@/shared/settings/model'
import { normalizeChatProfile } from '@/shared/settings/normalizeSettings'
import { chatSettingsStateAtom, editorSessionStateAtom } from '@/shared/state/atoms'
import {
  beginStyleGestureAtom,
  clearStyleHistoryAtom,
  commitProfileAtom,
  finishStyleGestureAtom,
  previewStylePatchAtom,
  redoStyleAtom,
  undoStyleAtom,
} from '@/shared/state/commands'

export type ChatProfilePatch = {
  appearance?: Partial<ChatAppearance>
  display?: Partial<ChatDisplay>
}

const cloneProfile = (profile: ChatProfile) => normalizeChatProfile(profile)

const applyPatch = (profile: ChatProfile, patch: ChatProfilePatch) =>
  normalizeChatProfile(
    {
      appearance: {
        ...profile.appearance,
        ...patch.appearance,
      },
      display: {
        ...profile.display,
        ...patch.display,
      },
    },
    profile,
  )

export type StyleHistoryCommands = {
  getEffectiveChatProfile: () => ChatProfile
  finishYLCStyleGesture: (gestureId?: string) => boolean
  beginYLCStyleGesture: (id: string, label: string) => void
  commitYLCStyleUpdate: (patch: ChatProfilePatch, label: string) => void
  commitYLCProfile: (profile: ChatProfile, label: string) => void
  previewYLCStyleUpdate: (gestureId: string, patch: ChatProfilePatch, label: string) => void
  undoYLCStyle: () => boolean
  redoYLCStyle: () => boolean
  clearYLCStyleHistory: () => void
}

export const createStyleHistoryCommands = (store: Store): StyleHistoryCommands => ({
  getEffectiveChatProfile: () => {
    const editor = store.get(editorSessionStateAtom)
    return cloneProfile(editor.draftProfile ?? store.get(chatSettingsStateAtom).profile)
  },
  finishYLCStyleGesture: gestureId => store.set(finishStyleGestureAtom, gestureId),
  beginYLCStyleGesture: (id, _label) => {
    store.set(finishStyleGestureAtom)
    store.set(beginStyleGestureAtom, id)
  },
  commitYLCStyleUpdate: (patch, _label) => {
    store.set(finishStyleGestureAtom)
    const current = store.get(chatSettingsStateAtom).profile
    store.set(commitProfileAtom, applyPatch(current, patch))
  },
  commitYLCProfile: (profile, _label) => {
    store.set(finishStyleGestureAtom)
    store.set(commitProfileAtom, cloneProfile(profile))
  },
  previewYLCStyleUpdate: (gestureId, patch, _label) => {
    store.set(previewStylePatchAtom, { id: gestureId, patch })
  },
  undoYLCStyle: () => store.set(undoStyleAtom),
  redoYLCStyle: () => store.set(redoStyleAtom),
  clearYLCStyleHistory: () => {
    store.set(clearStyleHistoryAtom)
  },
})

export const useStyleHistoryCommands = () => {
  const store = useStore()
  return useMemo(() => createStyleHistoryCommands(store), [store])
}
