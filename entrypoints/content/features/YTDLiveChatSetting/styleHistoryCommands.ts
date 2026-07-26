import { useChatEditorStore } from '@/entrypoints/content/settings/ChatEditorStore'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import type { ChatAppearance, ChatDisplay, ChatProfile } from '@/shared/settings/model'
import { normalizeChatProfile } from '@/shared/settings/normalizeSettings'

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

const profilesEqual = (left: ChatProfile, right: ChatProfile) => JSON.stringify(left) === JSON.stringify(right)

export const getEffectiveChatProfile = () => {
  const editor = useChatEditorStore.getState()
  return cloneProfile(editor.draftProfile ?? useChatSettingsStore.getState().profile)
}

export const finishYLCStyleGesture = (gestureId?: string) => {
  const editor = useChatEditorStore.getState()
  const gesture = editor.activeGesture
  if (!gesture || (gestureId !== undefined && gesture.id !== gestureId)) return false

  const draft = editor.draftProfile
  if (!draft || profilesEqual(gesture.before, draft)) {
    editor.cancelGesture()
    return true
  }

  useChatSettingsStore.getState().commitProfile(draft)
  editor.finishGesture(draft)
  return true
}

export const beginYLCStyleGesture = (id: string, _label: string) => {
  const editor = useChatEditorStore.getState()
  if (editor.activeGesture?.id === id) return
  finishYLCStyleGesture()
  const before = cloneProfile(useChatSettingsStore.getState().profile)
  useChatEditorStore.getState().beginGesture({ id, before })
}

export const commitYLCStyleUpdate = (patch: ChatProfilePatch, _label: string) => {
  finishYLCStyleGesture()
  const store = useChatSettingsStore.getState()
  const before = cloneProfile(store.profile)
  const next = applyPatch(before, patch)
  if (profilesEqual(before, next)) return
  store.commitProfile(next)
  useChatEditorStore.getState().recordCommit(before)
}

export const commitYLCProfile = (profile: ChatProfile, _label: string) => {
  finishYLCStyleGesture()
  const store = useChatSettingsStore.getState()
  const before = cloneProfile(store.profile)
  const next = cloneProfile(profile)
  if (profilesEqual(before, next)) return
  store.commitProfile(next)
  useChatEditorStore.getState().recordCommit(before)
}

export const previewYLCStyleUpdate = (gestureId: string, patch: ChatProfilePatch, label: string) => {
  if (useChatEditorStore.getState().activeGesture?.id !== gestureId) {
    beginYLCStyleGesture(gestureId, label)
  }
  useChatEditorStore.getState().setDraftProfile(applyPatch(getEffectiveChatProfile(), patch))
}

export const undoYLCStyle = () => {
  finishYLCStyleGesture()
  const store = useChatSettingsStore.getState()
  const target = useChatEditorStore.getState().takeUndoProfile(store.profile)
  if (!target) return false
  store.commitProfile(target)
  return true
}

export const redoYLCStyle = () => {
  finishYLCStyleGesture()
  const store = useChatSettingsStore.getState()
  const target = useChatEditorStore.getState().takeRedoProfile(store.profile)
  if (!target) return false
  store.commitProfile(target)
  return true
}

export const clearYLCStyleHistory = () => {
  useChatEditorStore.getState().clear()
}
