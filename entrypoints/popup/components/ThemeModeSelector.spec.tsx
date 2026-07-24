import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGlobalSettingStore } from '@/shared/stores'
import { ThemeModeSelector } from './ThemeModeSelector'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

const baseState = useGlobalSettingStore.getState()

describe('ThemeModeSelector', () => {
  beforeEach(() => {
    useGlobalSettingStore.setState(baseState, true)
  })

  it('updates the persisted theme mode', () => {
    const { getByRole } = render(<ThemeModeSelector />)

    fireEvent.click(getByRole('radio', { name: 'content.setting.themeMode.dark' }))

    expect(useGlobalSettingStore.getState().themeMode).toBe('dark')
  })
})
