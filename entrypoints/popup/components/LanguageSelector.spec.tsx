import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageSelector } from './LanguageSelector'

const { setLocale, sendActiveTabMessage } = vi.hoisted(() => ({
  setLocale: vi.fn(),
  sendActiveTabMessage: vi.fn(),
}))

vi.mock('@/shared/runtime/AppProvider', () => ({
  useAppRuntime: () => ({ setLocale }),
}))

vi.mock('../utils/sendActiveTabMessage', () => ({
  sendActiveTabMessage,
}))

describe('LanguageSelector', () => {
  beforeEach(() => {
    setLocale.mockClear()
    sendActiveTabMessage.mockClear()
  })

  it('updates i18n and sends the language payload', () => {
    const { getByRole } = render(<LanguageSelector />)

    fireEvent.change(getByRole('combobox', { name: 'content.aria.selectLanguage' }), { target: { value: 'pt_BR' } })

    expect(setLocale).toHaveBeenCalledWith('pt_BR')
    expect(sendActiveTabMessage).toHaveBeenCalledWith({ message: 'language', language: 'pt_BR' })
  })
})
