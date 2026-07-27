import { type RenderResult, render } from '@testing-library/react'
import { Provider } from 'jotai'
import { createStore } from 'jotai/vanilla'
import { createElement, type ReactElement } from 'react'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { ChatSettings } from '@/shared/settings/model'
import { chatSettingsStateAtom, editorSessionStateAtom, globalSettingsStateAtom } from './atoms'

export const createTestStore = () => createStore()

export const renderWithStore = (ui: ReactElement, store: ReturnType<typeof createStore>): RenderResult =>
  render(createElement(Provider, { store }, ui))

export const resetTestState = (store: ReturnType<typeof createStore>) => {
  store.set(globalSettingsStateAtom, { ytdLiveChat: true, themeMode: 'system' })
  store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)
  store.set(editorSessionStateAtom, { draftProfile: null, past: [], future: [], activeGesture: null })
}

export const patchChatSettings = (store: ReturnType<typeof createStore>, patch: Partial<ChatSettings>) => {
  store.set(chatSettingsStateAtom, { ...store.get(chatSettingsStateAtom), ...patch })
}
