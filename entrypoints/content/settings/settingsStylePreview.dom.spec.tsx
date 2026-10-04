import { act, fireEvent } from '@testing-library/react'
import { Provider } from 'jotai'
import { describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { chatSettingsStateAtom, editorSessionStateAtom, effectiveProfileAtom, settingsPreviewStateAtom } from '@/shared/state/atoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { SettingsFrame } from './SettingsFrame'
import { SETTINGS_FRAME_MESSAGE } from './settingsFrameMessages'

const extensionUrl = new URL(browser.runtime.getURL('/'))
const extensionOrigin = `${extensionUrl.protocol}//${extensionUrl.host}`
const profile = { ...DEFAULT_CHAT_PROFILE, appearance: { ...DEFAULT_CHAT_PROFILE.appearance, fontSize: 30, blur: 12, spacing: 24 } }

const setup = () => {
  const store = createTestStore()
  const runtime = { getDiagnosticReport: vi.fn(() => ({ schemaVersion: 1 }) as never), restart: vi.fn() }
  const view = renderWithStore(<SettingsFrame open onClose={vi.fn()} runtime={runtime} />, store)
  const frame = view.getByTitle('YouTube Live Chat Fullscreen settings') as HTMLIFrameElement
  const send = (data: unknown, source: MessageEventSource | null = frame.contentWindow, origin = extensionOrigin) =>
    fireEvent(window, new MessageEvent('message', { source, origin, data }))
  const preview = (active = true) => send({ type: SETTINGS_FRAME_MESSAGE.stylePreview, profile, active })
  return { store, runtime, view, frame, send, preview }
}

describe('embedded settings style preview', () => {
  it('updates the content effective profile during a gesture without saving or adding history', () => {
    const { store, preview } = setup()
    const committed = store.get(chatSettingsStateAtom)
    const editor = store.get(editorSessionStateAtom)

    preview()

    expect(store.get(effectiveProfileAtom)).toEqual(profile)
    expect(store.get(chatSettingsStateAtom)).toBe(committed)
    expect(store.get(editorSessionStateAtom)).toBe(editor)
  })

  it('rejects previews from other windows, origins, and malformed payloads', () => {
    const { store, send } = setup()
    const message = { type: SETTINGS_FRAME_MESSAGE.stylePreview, profile, active: true }
    send(message, window)
    send(message, undefined, 'https://www.youtube.com')
    send({ ...message, active: 'true' })
    send({ ...message, profile: {} })
    expect(store.get(settingsPreviewStateAtom)).toBeNull()
  })

  it('normalizes the profile before applying CSS-facing values', () => {
    const { store, send } = setup()
    send({
      type: SETTINGS_FRAME_MESSAGE.stylePreview,
      active: true,
      profile: { ...profile, appearance: { ...profile.appearance, fontSize: 999, blur: -2, fontFamily: 'untrusted-font' } },
    })
    expect(store.get(effectiveProfileAtom).appearance).toMatchObject({ fontSize: 40, blur: 0, fontFamily: null })
  })

  it('keeps the final preview until a committed appearance arrives, then releases it', () => {
    const { store, preview } = setup()
    preview()
    preview(false)
    expect(store.get(effectiveProfileAtom)).toEqual(profile)
    act(() => store.set(chatSettingsStateAtom, { ...store.get(chatSettingsStateAtom), profile }))
    expect(store.get(settingsPreviewStateAtom)).toBeNull()
    expect(store.get(effectiveProfileAtom)).toEqual(profile)
  })

  it('does not lose an active preview when an earlier save or callback rerender arrives', () => {
    const { store, runtime, view, preview } = setup()
    preview()
    act(() =>
      store.set(chatSettingsStateAtom, {
        ...store.get(chatSettingsStateAtom),
        profile: { ...DEFAULT_CHAT_PROFILE, appearance: { ...DEFAULT_CHAT_PROFILE.appearance, fontSize: 22 } },
      }),
    )
    view.rerender(
      <Provider store={store}>
        <SettingsFrame open onClose={vi.fn()} runtime={runtime} />
      </Provider>,
    )
    expect(store.get(effectiveProfileAtom)).toEqual(profile)
    view.unmount()
    expect(store.get(settingsPreviewStateAtom)).toBeNull()
    expect(store.get(effectiveProfileAtom).appearance.fontSize).toBe(22)
  })

  it('does not roll a finished preview back when an earlier gesture save arrives late', () => {
    const { store, preview } = setup()
    preview(false)
    act(() =>
      store.set(chatSettingsStateAtom, {
        ...store.get(chatSettingsStateAtom),
        profile: { ...DEFAULT_CHAT_PROFILE, appearance: { ...DEFAULT_CHAT_PROFILE.appearance, fontSize: 22 } },
      }),
    )
    expect(store.get(effectiveProfileAtom)).toEqual(profile)
    act(() => store.set(chatSettingsStateAtom, { ...store.get(chatSettingsStateAtom), profile }))
    expect(store.get(settingsPreviewStateAtom)).toBeNull()
  })

  it('clears previews on frame reload and close', () => {
    const { store, frame, send, preview } = setup()
    preview()
    fireEvent.load(frame)
    expect(store.get(settingsPreviewStateAtom)).toBeNull()
    preview()
    send({ type: SETTINGS_FRAME_MESSAGE.close })
    expect(store.get(settingsPreviewStateAtom)).toBeNull()
  })
})
