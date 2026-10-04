import { act, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type NumberSliderSettingKey,
  YLCNumberSlider,
} from '@/entrypoints/content/features/YTDLiveChatSetting/components/YLCChangeItems/YLCNumberSlider'
import { SETTINGS_FRAME_MESSAGE } from '@/entrypoints/content/settings/settingsFrameMessages'
import { chatSettingsStateAtom, editorSessionStateAtom } from '@/shared/state/atoms'
import {
  beginStyleGestureAtom,
  cancelStyleGestureAtom,
  commitStylePatchAtom,
  previewStylePatchAtom,
  undoStyleAtom,
} from '@/shared/state/commands'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { useSettingsStylePreview } from './useSettingsStylePreview'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const setup = (settingKey: NumberSliderSettingKey = 'fontSize') => {
  const store = createTestStore()
  const postToParent = vi.fn()
  const committed = vi.fn()
  const unsubscribeCommitted = store.sub(chatSettingsStateAtom, committed)
  const App = () => {
    useSettingsStylePreview(postToParent)
    return (
      <YLCNumberSlider
        settingKey={settingKey}
        labelKey='content.setting.fontSize'
        min={settingKey === 'fontSize' ? 10 : 0}
        max={settingKey === 'blur' ? 20 : 40}
      />
    )
  }
  const view = renderWithStore(<App />, store)
  return { ...view, store, postToParent, committed, unsubscribeCommitted, range: view.getByRole('slider') }
}

const advanceFrame = () => act(() => vi.advanceTimersToNextFrame())

describe('settings style preview sender', () => {
  it.each(['fontSize', 'blur', 'spacing'] as const)('previews %s before pointer release and commits one Undo entry', settingKey => {
    const { store, postToParent, committed, unsubscribeCommitted, range } = setup(settingKey)
    const initial = store.get(chatSettingsStateAtom).profile
    expect(postToParent).not.toHaveBeenCalled()

    fireEvent.pointerDown(range, { pointerId: 7, button: 0 })
    fireEvent.input(range, { target: { value: settingKey === 'fontSize' ? '20' : '4' } })
    fireEvent.input(range, { target: { value: settingKey === 'fontSize' ? '30' : '8' } })
    expect(committed).not.toHaveBeenCalled()
    expect(store.get(editorSessionStateAtom).past).toHaveLength(0)
    advanceFrame()

    const finalValue = settingKey === 'fontSize' ? 30 : 8
    expect(postToParent).toHaveBeenCalledOnce()
    expect(postToParent).toHaveBeenLastCalledWith({
      type: SETTINGS_FRAME_MESSAGE.stylePreview,
      active: true,
      profile: { ...initial, appearance: { ...initial.appearance, [settingKey]: finalValue } },
    })

    fireEvent.pointerUp(range, { pointerId: 7 })
    fireEvent.lostPointerCapture(range, { pointerId: 7 })
    fireEvent.blur(range)

    expect(committed).toHaveBeenCalledOnce()
    expect(store.get(editorSessionStateAtom).past).toEqual([initial])
    expect(postToParent).toHaveBeenCalledTimes(2)
    expect(postToParent).toHaveBeenLastCalledWith({
      type: SETTINGS_FRAME_MESSAGE.stylePreview,
      active: false,
      profile: store.get(chatSettingsStateAtom).profile,
    })
    unsubscribeCommitted()
  })

  it('publishes the final value immediately when pointer release precedes the scheduled preview', () => {
    const { store, postToParent, range } = setup()
    fireEvent.pointerDown(range, { pointerId: 7, button: 0 })
    fireEvent.input(range, { target: { value: '24' } })
    fireEvent.pointerUp(range, { pointerId: 7 })

    expect(postToParent).toHaveBeenCalledOnce()
    expect(postToParent).toHaveBeenLastCalledWith({
      type: SETTINGS_FRAME_MESSAGE.stylePreview,
      active: false,
      profile: store.get(chatSettingsStateAtom).profile,
    })
    advanceFrame()
    expect(postToParent).toHaveBeenCalledOnce()
  })

  it('sends Undo and later discrete edits after a finished preview without waiting for storage', () => {
    const { store, postToParent, range } = setup()
    const initial = store.get(chatSettingsStateAtom).profile
    fireEvent.pointerDown(range, { pointerId: 7, button: 0 })
    fireEvent.input(range, { target: { value: '24' } })
    advanceFrame()
    fireEvent.pointerUp(range, { pointerId: 7 })

    act(() => store.set(undoStyleAtom))
    expect(postToParent).toHaveBeenLastCalledWith({ type: SETTINGS_FRAME_MESSAGE.stylePreview, profile: initial, active: false })

    act(() => store.set(commitStylePatchAtom, { appearance: { blur: 6 } }))
    expect(postToParent).toHaveBeenLastCalledWith({
      type: SETTINGS_FRAME_MESSAGE.stylePreview,
      active: false,
      profile: store.get(chatSettingsStateAtom).profile,
    })
  })

  it('restores the committed profile when a preview is cancelled', () => {
    const { store, postToParent, committed } = setup()
    const initial = store.get(chatSettingsStateAtom).profile
    act(() => {
      store.set(beginStyleGestureAtom, 'range:fontSize')
      store.set(previewStylePatchAtom, { id: 'range:fontSize', patch: { appearance: { fontSize: 24 } } })
    })
    advanceFrame()

    act(() => store.set(cancelStyleGestureAtom))

    expect(postToParent).toHaveBeenLastCalledWith({ type: SETTINGS_FRAME_MESSAGE.stylePreview, profile: initial, active: false })
    expect(committed).not.toHaveBeenCalled()
  })

  it('clears its preview and cancels queued messages when the settings page unmounts', () => {
    const { store, postToParent, unmount } = setup()
    act(() => {
      store.set(beginStyleGestureAtom, 'range:fontSize')
      store.set(previewStylePatchAtom, { id: 'range:fontSize', patch: { appearance: { fontSize: 24 } } })
    })

    unmount()
    advanceFrame()
    expect(postToParent).toHaveBeenCalledOnce()
    expect(postToParent).toHaveBeenLastCalledWith({ type: SETTINGS_FRAME_MESSAGE.stylePreview, profile: null, active: false })

    act(() => store.set(commitStylePatchAtom, { appearance: { blur: 6 } }))
    expect(postToParent).toHaveBeenCalledOnce()
  })
})
