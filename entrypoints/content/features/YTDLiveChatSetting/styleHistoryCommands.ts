import { useStore } from 'jotai'
import type { Store } from 'jotai/vanilla'
import { useMemo } from 'react'
import type { ChatProfile } from '@/shared/settings/model'
import { normalizeChatProfile } from '@/shared/settings/normalizeSettings'
import { chatSettingsStateAtom, editorSessionStateAtom } from '@/shared/state/atoms'
import {
  applyPresetAtom,
  beginStyleGestureAtom,
  type ChatProfilePatch,
  clearStyleHistoryAtom,
  commitStylePatchAtom,
  finishStyleGestureAtom,
  previewStylePatchAtom,
  redoStyleAtom,
  undoStyleAtom,
} from '@/shared/state/commands'

const cloneProfile = (profile: ChatProfile) => normalizeChatProfile(profile)

export type StyleHistoryCommands = {
  getEffectiveChatProfile: () => ChatProfile
  finishYLCStyleGesture: (gestureId?: string) => boolean
  beginYLCStyleGesture: (id: string) => void
  commitYLCStyleUpdate: (patch: ChatProfilePatch) => void
  commitYLCProfile: (profile: ChatProfile) => void
  previewYLCStyleUpdate: (gestureId: string, patch: ChatProfilePatch) => void
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
  beginYLCStyleGesture: id => {
    if (store.get(editorSessionStateAtom).activeGesture?.id === id) return
    store.set(finishStyleGestureAtom)
    store.set(beginStyleGestureAtom, id)
  },
  commitYLCStyleUpdate: patch => store.set(commitStylePatchAtom, patch),
  commitYLCProfile: profile => store.set(applyPresetAtom, cloneProfile(profile)),
  previewYLCStyleUpdate: (gestureId, patch) => {
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
