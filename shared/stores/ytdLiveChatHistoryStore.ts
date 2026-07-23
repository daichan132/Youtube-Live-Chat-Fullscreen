import { create } from 'zustand'
import type { YLCStyleType } from '@/shared/types/ytdLiveChatType'
import { getYLCStyleSnapshot } from '@/shared/utils/ylcStyleSnapshot'

const HISTORY_LIMIT = 50

export type YLCStyleHistoryEntry = {
  before: YLCStyleHistorySnapshot
  after: YLCStyleHistorySnapshot
  label: string
}

export type YLCStyleHistorySnapshot = {
  style: YLCStyleType
  addPresetEnabled: boolean
}

export type YLCStyleGesture = {
  id: string
  before: YLCStyleHistorySnapshot
  label: string
}

type YTDLiveChatHistoryState = {
  past: YLCStyleHistoryEntry[]
  future: YLCStyleHistoryEntry[]
  activeGesture: YLCStyleGesture | null
  record: (entry: YLCStyleHistoryEntry) => void
  setActiveGesture: (gesture: YLCStyleGesture | null) => void
  takeUndoEntry: () => YLCStyleHistoryEntry | null
  takeRedoEntry: () => YLCStyleHistoryEntry | null
  clear: () => void
}

const cloneEntry = (entry: YLCStyleHistoryEntry): YLCStyleHistoryEntry => ({
  before: {
    style: getYLCStyleSnapshot(entry.before.style),
    addPresetEnabled: entry.before.addPresetEnabled,
  },
  after: {
    style: getYLCStyleSnapshot(entry.after.style),
    addPresetEnabled: entry.after.addPresetEnabled,
  },
  label: entry.label,
})

export const useYTDLiveChatHistoryStore = create<YTDLiveChatHistoryState>(set => ({
  past: [],
  future: [],
  activeGesture: null,
  record: entry =>
    set(state => ({
      past: [...state.past, cloneEntry(entry)].slice(-HISTORY_LIMIT),
      future: [],
    })),
  setActiveGesture: activeGesture =>
    set({
      activeGesture: activeGesture
        ? {
            ...activeGesture,
            before: {
              style: getYLCStyleSnapshot(activeGesture.before.style),
              addPresetEnabled: activeGesture.before.addPresetEnabled,
            },
          }
        : null,
    }),
  takeUndoEntry: () => {
    let entry: YLCStyleHistoryEntry | null = null
    set(state => {
      entry = state.past.at(-1) ?? null
      if (!entry) return state
      return {
        past: state.past.slice(0, -1),
        future: [entry, ...state.future],
      }
    })
    return entry
  },
  takeRedoEntry: () => {
    let entry: YLCStyleHistoryEntry | null = null
    set(state => {
      entry = state.future[0] ?? null
      if (!entry) return state
      return {
        past: [...state.past, entry].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
      }
    })
    return entry
  },
  clear: () => set({ past: [], future: [], activeGesture: null }),
}))
