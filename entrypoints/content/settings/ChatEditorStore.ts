import { create } from 'zustand'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import type { ChatProfile } from '@/shared/settings/model'
import { normalizeChatProfile } from '@/shared/settings/normalizeSettings'

const HISTORY_LIMIT = 50

export type ChatProfileGesture = {
  id: string
  before: ChatProfile
}

type ChatEditorState = {
  draftProfile: ChatProfile | null
  past: ChatProfile[]
  future: ChatProfile[]
  activeGesture: ChatProfileGesture | null
  setDraftProfile: (profile: ChatProfile | null) => void
  beginGesture: (gesture: ChatProfileGesture) => void
  finishGesture: (committedProfile: ChatProfile) => void
  cancelGesture: () => void
  recordCommit: (before: ChatProfile) => void
  takeUndoProfile: (current: ChatProfile) => ChatProfile | null
  takeRedoProfile: (current: ChatProfile) => ChatProfile | null
  clear: () => void
}

const cloneProfile = (profile: ChatProfile) => normalizeChatProfile(profile)

export const useChatEditorStore = create<ChatEditorState>(set => ({
  draftProfile: null,
  past: [],
  future: [],
  activeGesture: null,
  setDraftProfile: draftProfile => set({ draftProfile: draftProfile ? cloneProfile(draftProfile) : null }),
  beginGesture: activeGesture =>
    set(state => ({
      activeGesture: {
        id: activeGesture.id,
        before: cloneProfile(activeGesture.before),
      },
      draftProfile: state.draftProfile ?? cloneProfile(activeGesture.before),
    })),
  finishGesture: _committedProfile =>
    set(state => {
      if (!state.activeGesture) return { draftProfile: null }
      return {
        past: [...state.past, cloneProfile(state.activeGesture.before)].slice(-HISTORY_LIMIT),
        future: [],
        activeGesture: null,
        draftProfile: null,
      }
    }),
  cancelGesture: () => set({ activeGesture: null, draftProfile: null }),
  recordCommit: before =>
    set(state => ({
      past: [...state.past, cloneProfile(before)].slice(-HISTORY_LIMIT),
      future: [],
      activeGesture: null,
      draftProfile: null,
    })),
  takeUndoProfile: current => {
    let target: ChatProfile | null = null
    set(state => {
      target = state.past.at(-1) ?? null
      if (!target) return state
      return {
        past: state.past.slice(0, -1),
        future: [cloneProfile(current), ...state.future],
        activeGesture: null,
        draftProfile: null,
      }
    })
    return target ? cloneProfile(target) : null
  },
  takeRedoProfile: current => {
    let target: ChatProfile | null = null
    set(state => {
      target = state.future[0] ?? null
      if (!target) return state
      return {
        past: [...state.past, cloneProfile(current)].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        activeGesture: null,
        draftProfile: null,
      }
    })
    return target ? cloneProfile(target) : null
  },
  clear: () => set({ draftProfile: null, past: [], future: [], activeGesture: null }),
}))

export const useEffectiveChatProfile = () => {
  const committedProfile = useChatSettingsStore(state => state.profile)
  return useChatEditorStore(state => state.draftProfile) ?? committedProfile
}
