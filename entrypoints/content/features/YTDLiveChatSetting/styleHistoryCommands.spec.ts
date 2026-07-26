import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatEditorStore } from '@/entrypoints/content/settings/ChatEditorStore'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import {
  beginYLCStyleGesture,
  clearYLCStyleHistory,
  commitYLCStyleUpdate,
  finishYLCStyleGesture,
  previewYLCStyleUpdate,
  redoYLCStyle,
  undoYLCStyle,
} from './styleHistoryCommands'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

const resetStores = () => {
  useChatSettingsStore.setState(DEFAULT_CHAT_SETTINGS)
  clearYLCStyleHistory()
}

describe('styleHistoryCommands', () => {
  beforeEach(resetStores)

  it('records a committed profile change and restores it through undo and redo', () => {
    const initialFontSize = useChatSettingsStore.getState().profile.appearance.fontSize

    commitYLCStyleUpdate({ appearance: { fontSize: initialFontSize + 4 } }, 'fontSize')

    expect(useChatEditorStore.getState().past).toHaveLength(1)
    expect(undoYLCStyle()).toBe(true)
    expect(useChatSettingsStore.getState().profile.appearance.fontSize).toBe(initialFontSize)
    expect(useChatEditorStore.getState().future).toHaveLength(1)

    expect(redoYLCStyle()).toBe(true)
    expect(useChatSettingsStore.getState().profile.appearance.fontSize).toBe(initialFontSize + 4)
  })

  it('keeps gesture previews in draft and persists once at gesture completion', () => {
    const store = useChatSettingsStore.getState()
    const commitProfile = vi.spyOn(store, 'commitProfile')
    const initialBlur = store.profile.appearance.blur

    beginYLCStyleGesture('range:blur', 'blur')
    previewYLCStyleUpdate('range:blur', { appearance: { blur: initialBlur + 2 } }, 'blur')
    previewYLCStyleUpdate('range:blur', { appearance: { blur: initialBlur + 6 } }, 'blur')

    expect(useChatSettingsStore.getState().profile.appearance.blur).toBe(initialBlur)
    expect(useChatEditorStore.getState().draftProfile?.appearance.blur).toBe(initialBlur + 6)
    expect(commitProfile).not.toHaveBeenCalled()

    finishYLCStyleGesture('range:blur')

    expect(commitProfile).toHaveBeenCalledTimes(1)
    expect(useChatSettingsStore.getState().profile.appearance.blur).toBe(initialBlur + 6)
    expect(useChatEditorStore.getState().past).toHaveLength(1)
    expect(useChatEditorStore.getState().activeGesture).toBeNull()
    expect(useChatEditorStore.getState().draftProfile).toBeNull()
  })

  it('does not record no-op changes and clears redo after a new edit', () => {
    const initialSpacing = useChatSettingsStore.getState().profile.appearance.spacing

    commitYLCStyleUpdate({ appearance: { spacing: initialSpacing } }, 'spacing')
    expect(useChatEditorStore.getState().past).toHaveLength(0)

    commitYLCStyleUpdate({ appearance: { spacing: initialSpacing + 1 } }, 'spacing')
    expect(undoYLCStyle()).toBe(true)
    expect(useChatEditorStore.getState().future).toHaveLength(1)

    commitYLCStyleUpdate({ appearance: { blur: 7 } }, 'blur')
    expect(useChatEditorStore.getState().future).toHaveLength(0)
    expect(redoYLCStyle()).toBe(false)
  })

  it('keeps at most fifty history profiles', () => {
    for (let index = 0; index < 55; index += 1) {
      commitYLCStyleUpdate({ appearance: { fontColor: { r: index, g: 0, b: 0, a: 1 } } }, 'fontColor')
    }

    expect(useChatEditorStore.getState().past).toHaveLength(50)
  })
})
