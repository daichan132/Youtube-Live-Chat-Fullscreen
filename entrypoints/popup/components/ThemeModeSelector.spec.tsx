import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGlobalSettingStore } from '@/shared/stores'
import { ThemeModeSelector } from './ThemeModeSelector'

const sendActiveTabMessage = vi.hoisted(() => vi.fn())

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

vi.mock('../utils/sendActiveTabMessage', () => ({
  sendActiveTabMessage,
}))

const baseState = useGlobalSettingStore.getState()

describe('ThemeModeSelector', () => {
  beforeEach(() => {
    sendActiveTabMessage.mockClear()
    useGlobalSettingStore.setState(baseState, true)
  })

  it('updates the theme mode and sends the themeMode payload', () => {
    const { getByRole } = render(<ThemeModeSelector />)

    fireEvent.click(getByRole('radio', { name: 'content.setting.themeMode.dark' }))

    expect(useGlobalSettingStore.getState().themeMode).toBe('dark')
    expect(sendActiveTabMessage).toHaveBeenCalledWith({ message: 'themeMode', themeMode: 'dark' })
  })
})
