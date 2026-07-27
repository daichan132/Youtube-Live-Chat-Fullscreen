import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom, editorSessionStateAtom } from '@/shared/state/atoms'
import { createTestStore } from '@/shared/state/testUtils'
import { createStyleHistoryCommands } from './styleHistoryCommands'

const store = createTestStore()
const {
  beginYLCStyleGesture,
  clearYLCStyleHistory,
  commitYLCStyleUpdate,
  finishYLCStyleGesture,
  previewYLCStyleUpdate,
  redoYLCStyle,
  undoYLCStyle,
} = createStyleHistoryCommands(store)

const resetStores = () => {
  store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)
  clearYLCStyleHistory()
}

describe('styleHistoryCommands', () => {
  beforeEach(resetStores)

  it('records a committed profile change and restores it through undo and redo', () => {
    const initialFontSize = store.get(chatSettingsStateAtom).profile.appearance.fontSize

    commitYLCStyleUpdate({ appearance: { fontSize: initialFontSize + 4 } }, 'fontSize')

    expect(store.get(editorSessionStateAtom).past).toHaveLength(1)
    expect(undoYLCStyle()).toBe(true)
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(initialFontSize)
    expect(store.get(editorSessionStateAtom).future).toHaveLength(1)

    expect(redoYLCStyle()).toBe(true)
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(initialFontSize + 4)
  })

  it('keeps gesture previews in draft and persists once at gesture completion', () => {
    const initialBlur = store.get(chatSettingsStateAtom).profile.appearance.blur

    beginYLCStyleGesture('range:blur', 'blur')
    previewYLCStyleUpdate('range:blur', { appearance: { blur: initialBlur + 2 } }, 'blur')
    previewYLCStyleUpdate('range:blur', { appearance: { blur: initialBlur + 6 } }, 'blur')

    expect(store.get(chatSettingsStateAtom).profile.appearance.blur).toBe(initialBlur)
    expect(store.get(editorSessionStateAtom).draftProfile?.appearance.blur).toBe(initialBlur + 6)

    finishYLCStyleGesture('range:blur')

    expect(store.get(chatSettingsStateAtom).profile.appearance.blur).toBe(initialBlur + 6)
    expect(store.get(editorSessionStateAtom).past).toHaveLength(1)
    expect(store.get(editorSessionStateAtom).activeGesture).toBeNull()
    expect(store.get(editorSessionStateAtom).draftProfile).toBeNull()
  })

  it('does not record no-op changes and clears redo after a new edit', () => {
    const initialSpacing = store.get(chatSettingsStateAtom).profile.appearance.spacing

    commitYLCStyleUpdate({ appearance: { spacing: initialSpacing } }, 'spacing')
    expect(store.get(editorSessionStateAtom).past).toHaveLength(0)

    commitYLCStyleUpdate({ appearance: { spacing: initialSpacing + 1 } }, 'spacing')
    expect(undoYLCStyle()).toBe(true)
    expect(store.get(editorSessionStateAtom).future).toHaveLength(1)

    commitYLCStyleUpdate({ appearance: { blur: 7 } }, 'blur')
    expect(store.get(editorSessionStateAtom).future).toHaveLength(0)
    expect(redoYLCStyle()).toBe(false)
  })

  it('keeps at most fifty history profiles', () => {
    for (let index = 0; index < 55; index += 1) {
      commitYLCStyleUpdate({ appearance: { fontColor: { r: index, g: 0, b: 0, a: 1 } } }, 'fontColor')
    }

    expect(store.get(editorSessionStateAtom).past).toHaveLength(50)
  })
})
