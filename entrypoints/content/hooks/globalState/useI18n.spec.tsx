import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useI18n } from './useI18n'

const changeLanguage = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      changeLanguage,
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

describe('useI18n', () => {
  beforeEach(() => {
    changeLanguage.mockClear()
  })

  it('changes language when a runtime message arrives', () => {
    renderHook(() => useI18n())

    const runtime = (chrome as unknown as { runtime: { __emitMessage: (message: unknown) => void } }).runtime

    act(() => {
      runtime.__emitMessage({ message: 'language', language: 'ja' })
    })

    expect(changeLanguage).toHaveBeenCalledWith('ja')
  })

  it('normalizes regional language code before changing language', () => {
    renderHook(() => useI18n())

    const runtime = (chrome as unknown as { runtime: { __emitMessage: (message: unknown) => void } }).runtime

    act(() => {
      runtime.__emitMessage({ message: 'language', language: 'pt-BR' })
    })

    expect(changeLanguage).toHaveBeenCalledWith('pt_BR')
  })

  it('ignores unrelated runtime messages', () => {
    renderHook(() => useI18n())

    const runtime = (chrome as unknown as { runtime: { __emitMessage: (message: unknown) => void } }).runtime

    act(() => {
      runtime.__emitMessage({ message: 'other', language: 'en' })
    })

    expect(changeLanguage).not.toHaveBeenCalled()
  })
})
