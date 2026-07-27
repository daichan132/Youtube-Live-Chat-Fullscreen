import { fireEvent } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { beforeEach, describe, expect, it } from 'vitest'
import { globalSettingsStateAtom } from '@/shared/state/atoms'
import { renderWithStore } from '@/shared/state/testUtils'
import { ThemeModeSelector } from './ThemeModeSelector'

const store = createStore()

describe('ThemeModeSelector', () => {
  beforeEach(() => {
    store.set(globalSettingsStateAtom, { ytdLiveChat: true, themeMode: 'system' })
  })

  it('updates the persisted theme mode', () => {
    const { getByRole } = renderWithStore(<ThemeModeSelector />, store)

    fireEvent.click(getByRole('radio', { name: 'content.setting.themeMode.dark' }))

    expect(store.get(globalSettingsStateAtom).themeMode).toBe('dark')
  })
})
