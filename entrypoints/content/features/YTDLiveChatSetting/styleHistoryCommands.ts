import { useYTDLiveChatHistoryStore } from '@/shared/stores/ytdLiveChatHistoryStore'
import { useYTDLiveChatStore } from '@/shared/stores/ytdLiveChatStore'
import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { areYLCStylesEqual, getYLCStyleSnapshot } from '@/shared/utils/ylcStyleSnapshot'

const getCurrentSnapshot = () => {
  const state = useYTDLiveChatStore.getState()
  return {
    style: getYLCStyleSnapshot(state),
    addPresetEnabled: state.addPresetEnabled,
  }
}

const recordChange = (before: ReturnType<typeof getCurrentSnapshot>, after: ReturnType<typeof getCurrentSnapshot>, label: string) => {
  if (areYLCStylesEqual(before.style, after.style) && before.addPresetEnabled === after.addPresetEnabled) return
  useYTDLiveChatHistoryStore.getState().record({ before, after, label })
}

export const finishYLCStyleGesture = (gestureId?: string) => {
  const history = useYTDLiveChatHistoryStore.getState()
  const gesture = history.activeGesture
  if (!gesture || (gestureId !== undefined && gesture.id !== gestureId)) return false

  history.setActiveGesture(null)
  recordChange(gesture.before, getCurrentSnapshot(), gesture.label)
  return true
}

export const beginYLCStyleGesture = (id: string, label: string) => {
  const activeGesture = useYTDLiveChatHistoryStore.getState().activeGesture
  if (activeGesture?.id === id) return
  finishYLCStyleGesture()
  useYTDLiveChatHistoryStore.getState().setActiveGesture({
    id,
    before: getCurrentSnapshot(),
    label,
  })
}

export const commitYLCStyleUpdate = (update: YLCStyleUpdateType, label: string, addPresetEnabled = true) => {
  finishYLCStyleGesture()
  const before = getCurrentSnapshot()
  const store = useYTDLiveChatStore.getState()
  store.updateYLCStyle(update)
  if (!addPresetEnabled) {
    store.setAddPresetEnabled(false)
  }
  recordChange(before, getCurrentSnapshot(), label)
}

export const previewYLCStyleUpdate = (gestureId: string, update: YLCStyleUpdateType, label: string) => {
  const activeGesture = useYTDLiveChatHistoryStore.getState().activeGesture
  if (activeGesture?.id !== gestureId) {
    beginYLCStyleGesture(gestureId, label)
  }
  useYTDLiveChatStore.getState().updateYLCStyle(update)
}

export const undoYLCStyle = () => {
  finishYLCStyleGesture()
  const entry = useYTDLiveChatHistoryStore.getState().takeUndoEntry()
  if (!entry) return false
  const store = useYTDLiveChatStore.getState()
  store.updateYLCStyle(getYLCStyleSnapshot(entry.before.style))
  store.setAddPresetEnabled(entry.before.addPresetEnabled)
  return true
}

export const redoYLCStyle = () => {
  finishYLCStyleGesture()
  const entry = useYTDLiveChatHistoryStore.getState().takeRedoEntry()
  if (!entry) return false
  const store = useYTDLiveChatStore.getState()
  store.updateYLCStyle(getYLCStyleSnapshot(entry.after.style))
  store.setAddPresetEnabled(entry.after.addPresetEnabled)
  return true
}

export const clearYLCStyleHistory = () => {
  useYTDLiveChatHistoryStore.getState().clear()
}
