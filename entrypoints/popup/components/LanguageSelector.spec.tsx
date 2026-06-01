import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageSelector } from './LanguageSelector'

const { changeLanguage, sendActiveTabMessage } = vi.hoisted(() => ({
  changeLanguage: vi.fn(),
  sendActiveTabMessage: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      resolvedLanguage: 'en',
      changeLanguage,
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

vi.mock('../utils/sendActiveTabMessage', () => ({
  sendActiveTabMessage,
}))

describe('LanguageSelector', () => {
  beforeEach(() => {
    changeLanguage.mockClear()
    sendActiveTabMessage.mockClear()
  })

  it('updates i18n and sends the language payload', () => {
    const { getByRole } = render(<LanguageSelector />)

    fireEvent.change(getByRole('combobox', { name: 'content.aria.selectLanguage' }), { target: { value: 'pt_BR' } })

    expect(changeLanguage).toHaveBeenCalledWith('pt_BR')
    expect(sendActiveTabMessage).toHaveBeenCalledWith({ message: 'language', language: 'pt_BR' })
  })
})
