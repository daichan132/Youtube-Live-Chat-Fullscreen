import { act, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createAppRuntime } from '@/shared/runtime/createAppRuntime'
import { createSettingsRepository } from '@/shared/settings/repository'
import { chatSettingsStateAtom, EMPTY_MESSAGES, editorSessionStateAtom, replaceExternalAppearanceAtom } from '@/shared/state/atoms'
import { beginStyleGestureAtom, finishStyleGestureAtom, previewStylePatchAtom, undoStyleAtom } from '@/shared/state/commands'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { YLCNumberSlider } from './YLCNumberSlider'

const slider = <YLCNumberSlider settingKey='fontSize' labelKey='content.setting.fontSize' min={10} max={40} />

describe('range input without pointer or keyboard gestures', () => {
  it('persists native input actions before the settings frame is removed', async () => {
    const repository = createSettingsRepository('native-input', null)
    const runtime = await createAppRuntime(repository, { loadMessages: async () => EMPTY_MESSAGES })
    const view = renderWithStore(slider, runtime.store)
    try {
      const range = view.getByRole('slider', { name: 'content.setting.fontSize' })
      // Accessibility actions change the native range value without dispatching
      // pointerdown/keyup. Removing its frame need not dispatch blur either.
      fireEvent.input(range, { target: { value: '14' } })
      fireEvent.input(range, { target: { value: '15' } })
      expect(range).toHaveValue('15')
      view.unmount()
      runtime.dispose()
      await repository.flush()

      expect(runtime.store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(15)
      expect(runtime.store.get(editorSessionStateAtom).draftProfile).toBeNull()
      expect(runtime.store.get(editorSessionStateAtom).past).toHaveLength(2)
    } finally {
      view.unmount()
      runtime.dispose()
    }

    const reopened = await createAppRuntime(createSettingsRepository('reopened-native-input', null), {
      loadMessages: async () => EMPTY_MESSAGES,
    })
    try {
      expect(reopened.store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(15)
    } finally {
      reopened.dispose()
    }
  })

  it('continues previewing keyboard input until keyup commits one history entry', () => {
    const store = createTestStore()
    const view = renderWithStore(slider, store)
    const range = view.getByRole('slider', { name: 'content.setting.fontSize' })

    fireEvent.keyDown(range, { key: 'ArrowRight' })
    fireEvent.input(range, { target: { value: '14' } })
    fireEvent.input(range, { target: { value: '15' } })

    expect(range).toHaveValue('15')
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(13)
    expect(store.get(editorSessionStateAtom).past).toHaveLength(0)

    fireEvent.keyUp(range, { key: 'ArrowRight' })

    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(15)
    expect(store.get(editorSessionStateAtom).past).toHaveLength(1)
  })

  it('keeps held-key repeats as one preview and commits once when the key is released', () => {
    const store = createTestStore()
    const view = renderWithStore(slider, store)
    const range = view.getByRole('slider')
    const committed = vi.fn()
    const unsubscribe = store.sub(chatSettingsStateAtom, committed)
    const initial = store.get(chatSettingsStateAtom).profile

    try {
      fireEvent.keyDown(range, { key: 'ArrowRight' })
      fireEvent.input(range, { target: { value: '14' } })
      fireEvent.keyDown(range, { key: 'ArrowRight', repeat: true })
      fireEvent.input(range, { target: { value: '15' } })

      expect(range).toHaveValue('15')
      expect(store.get(chatSettingsStateAtom).profile).toBe(initial)
      expect(store.get(editorSessionStateAtom).draftProfile?.appearance.fontSize).toBe(15)
      expect(store.get(editorSessionStateAtom).past).toHaveLength(0)
      expect(committed).not.toHaveBeenCalled()

      fireEvent.keyUp(range, { key: 'ArrowRight' })
      fireEvent.blur(range)

      expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(15)
      expect(store.get(editorSessionStateAtom).past).toEqual([initial])
      expect(committed).toHaveBeenCalledOnce()
      act(() => store.set(undoStyleAtom))
      expect(store.get(chatSettingsStateAtom).profile).toEqual(initial)
      expect(store.get(editorSessionStateAtom).past).toHaveLength(0)
    } finally {
      unsubscribe()
    }
  })

  it('finishes another control gesture before committing native input and keeps both undo steps', () => {
    const store = createTestStore()
    const view = renderWithStore(slider, store)
    act(() => {
      store.set(beginStyleGestureAtom, 'range:blur')
      store.set(previewStylePatchAtom, { id: 'range:blur', patch: { appearance: { blur: 8 } } })
    })

    fireEvent.input(view.getByRole('slider'), { target: { value: '15' } })

    expect(store.get(chatSettingsStateAtom).profile.appearance).toMatchObject({ blur: 8, fontSize: 15 })
    expect(store.get(editorSessionStateAtom).past).toHaveLength(2)
    expect(store.get(editorSessionStateAtom).activeGesture).toBeNull()
    expect(store.set(finishStyleGestureAtom, 'range:blur')).toBe(false)

    act(() => store.set(undoStyleAtom))
    expect(store.get(chatSettingsStateAtom).profile.appearance).toMatchObject({ blur: 8, fontSize: 13 })
    act(() => store.set(undoStyleAtom))
    expect(store.get(chatSettingsStateAtom).profile.appearance).toMatchObject({ blur: 0, fontSize: 13 })
  })

  it('commits against the external profile when an external update cancels an earlier local gesture', () => {
    const store = createTestStore()
    const view = renderWithStore(slider, store)
    const range = view.getByRole('slider')
    fireEvent.keyDown(range, { key: 'ArrowRight' })
    fireEvent.input(range, { target: { value: '14' } })
    const current = store.get(chatSettingsStateAtom)
    act(() => {
      store.set(replaceExternalAppearanceAtom, {
        presets: current.presets,
        profile: { ...current.profile, appearance: { ...current.profile.appearance, blur: 6, fontSize: 22 } },
      })
    })

    fireEvent.input(range, { target: { value: '23' } })

    expect(store.get(chatSettingsStateAtom).profile.appearance).toMatchObject({ blur: 6, fontSize: 23 })
    expect(store.get(editorSessionStateAtom).draftProfile).toBeNull()
    expect(store.get(editorSessionStateAtom).past).toHaveLength(1)
    act(() => store.set(undoStyleAtom))
    expect(store.get(chatSettingsStateAtom).profile.appearance).toMatchObject({ blur: 6, fontSize: 22 })
  })
})
