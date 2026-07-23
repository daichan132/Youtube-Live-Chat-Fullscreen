import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatHistoryStore } from '@/shared/stores/ytdLiveChatHistoryStore'
import { useYTDLiveChatStore } from '@/shared/stores/ytdLiveChatStore'
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

const baseState = useYTDLiveChatStore.getState()

const resetStores = () => {
  useYTDLiveChatStore.setState(
    {
      ...baseState,
      bgColor: { ...baseState.bgColor },
      fontColor: { ...baseState.fontColor },
      membershipNameColor: { ...baseState.membershipNameColor },
      coordinates: { ...baseState.coordinates },
      size: { ...baseState.size },
      presetItemIds: [...baseState.presetItemIds],
      presetItemStyles: { ...baseState.presetItemStyles },
      presetItemTitles: { ...baseState.presetItemTitles },
    },
    true,
  )
  clearYLCStyleHistory()
}

describe('styleHistoryCommands', () => {
  beforeEach(resetStores)

  it('records a committed style change and restores it through undo and redo', () => {
    const initialFontSize = useYTDLiveChatStore.getState().fontSize

    commitYLCStyleUpdate({ fontSize: initialFontSize + 4 }, 'fontSize')

    expect(useYTDLiveChatHistoryStore.getState().past).toHaveLength(1)
    expect(undoYLCStyle()).toBe(true)
    expect(useYTDLiveChatStore.getState().fontSize).toBe(initialFontSize)
    expect(useYTDLiveChatHistoryStore.getState().future).toHaveLength(1)
    expect(useYTDLiveChatStore.getState().bgColor).not.toBe(useYTDLiveChatHistoryStore.getState().future[0].before.style.bgColor)

    expect(redoYLCStyle()).toBe(true)
    expect(useYTDLiveChatStore.getState().fontSize).toBe(initialFontSize + 4)
    expect(useYTDLiveChatStore.getState().bgColor).not.toBe(useYTDLiveChatHistoryStore.getState().past[0].after.style.bgColor)
  })

  it('groups a continuous gesture into one complete-snapshot history entry', () => {
    const initialBlur = useYTDLiveChatStore.getState().blur

    beginYLCStyleGesture('range:blur', 'blur')
    previewYLCStyleUpdate('range:blur', { blur: initialBlur + 2 }, 'blur')
    previewYLCStyleUpdate('range:blur', { blur: initialBlur + 6 }, 'blur')
    finishYLCStyleGesture('range:blur')

    const history = useYTDLiveChatHistoryStore.getState()
    expect(history.past).toHaveLength(1)
    expect(history.past[0].before.style.blur).toBe(initialBlur)
    expect(history.past[0].after.style.blur).toBe(initialBlur + 6)
    expect(history.activeGesture).toBeNull()
  })

  it('does not record no-op changes and clears redo after a new edit', () => {
    const initialSpace = useYTDLiveChatStore.getState().space

    commitYLCStyleUpdate({ space: initialSpace }, 'space')
    expect(useYTDLiveChatHistoryStore.getState().past).toHaveLength(0)

    commitYLCStyleUpdate({ space: initialSpace + 1 }, 'space')
    expect(undoYLCStyle()).toBe(true)
    expect(useYTDLiveChatHistoryStore.getState().future).toHaveLength(1)

    commitYLCStyleUpdate({ blur: 7 }, 'blur')
    expect(useYTDLiveChatHistoryStore.getState().future).toHaveLength(0)
    expect(redoYLCStyle()).toBe(false)
  })

  it('restores the preset dirty state together with style changes', () => {
    const initialFontSize = useYTDLiveChatStore.getState().fontSize

    commitYLCStyleUpdate({ fontSize: initialFontSize + 5 }, 'preset', false)
    expect(useYTDLiveChatStore.getState().addPresetEnabled).toBe(false)

    expect(undoYLCStyle()).toBe(true)
    expect(useYTDLiveChatStore.getState().fontSize).toBe(initialFontSize)
    expect(useYTDLiveChatStore.getState().addPresetEnabled).toBe(true)

    expect(redoYLCStyle()).toBe(true)
    expect(useYTDLiveChatStore.getState().fontSize).toBe(initialFontSize + 5)
    expect(useYTDLiveChatStore.getState().addPresetEnabled).toBe(false)
  })

  it('keeps at most fifty history entries', () => {
    for (let index = 0; index < 55; index += 1) {
      commitYLCStyleUpdate({ fontSize: 100 + index }, 'fontSize')
    }

    expect(useYTDLiveChatHistoryStore.getState().past).toHaveLength(50)
  })
})
