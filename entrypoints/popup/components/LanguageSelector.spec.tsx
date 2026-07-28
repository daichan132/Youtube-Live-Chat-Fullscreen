import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageSelector } from './LanguageSelector'

const { setLocale } = vi.hoisted(() => ({
  setLocale: vi.fn(),
}))

vi.mock('@/shared/runtime/AppProvider', () => ({
  useAppRuntime: () => ({ setLocale }),
}))

describe('LanguageSelector', () => {
  beforeEach(() => {
    setLocale.mockClear()
  })

  it('updates locale through the app runtime', () => {
    const { getByRole } = render(<LanguageSelector />)

    fireEvent.change(getByRole('combobox', { name: 'content.aria.selectLanguage' }), { target: { value: 'pt_BR' } })

    expect(setLocale).toHaveBeenCalledWith('pt_BR')
  })
})
