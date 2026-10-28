import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PersistenceNotice } from '@/shared/components/PersistenceNotice'
import type { LocaleCode, LocaleMessages } from '@/shared/i18n/generated/translationTypes'
import { AppProvider } from '@/shared/runtime/AppProvider'
import { createAppRuntime } from '@/shared/runtime/createAppRuntime'
import { createSettingsRepository } from '@/shared/settings/repository'
import { LOCALE_STORAGE_KEY } from '@/shared/settings/storageKeys'
import { EMPTY_MESSAGES } from '@/shared/state/atoms'
import { LanguageSelector } from './LanguageSelector'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
  vi.restoreAllMocks()
})

const setup = async (loadMessages: (locale: LocaleCode) => Promise<LocaleMessages> = async () => EMPTY_MESSAGES) => {
  const repository = createSettingsRepository('language-popup', null, { waitBeforeRetry: async () => {} })
  const runtime = await createAppRuntime(repository, { loadMessages })
  cleanups.push(async () => {
    await repository.flush().catch(() => {})
    runtime.dispose()
  })
  const view = render(
    <AppProvider runtime={runtime}>
      <LanguageSelector />
      <PersistenceNotice />
    </AppProvider>,
  )
  return { runtime, repository, view }
}

describe('LanguageSelector', () => {
  it('renders and saves a selected language so reopening keeps the choice', async () => {
    const { runtime, repository, view } = await setup()
    expect(screen.getByRole('option', { name: '日本語' })).toHaveAttribute('lang', 'ja')
    expect(screen.getByRole('option', { name: 'Português (Brasil)' })).toHaveAttribute('lang', 'pt-BR')
    fireEvent.change(screen.getByRole('combobox', { name: 'content.aria.selectLanguage' }), { target: { value: 'pt_BR' } })
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('pt_BR'))
    await act(() => repository.flush())
    expect((await chrome.storage.local.get(LOCALE_STORAGE_KEY))[LOCALE_STORAGE_KEY]).toEqual({
      schemaVersion: 1,
      writerId: 'language-popup',
      value: 'pt_BR',
    })

    view.unmount()
    runtime.dispose()
    await setup()
    expect(screen.getByRole('combobox')).toHaveValue('pt_BR')
  })

  it('keeps an unsaved language selected and lets Retry save it without another selection', async () => {
    await chrome.storage.local.set({
      [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'previous-page', value: 'en' },
    })
    const { repository } = await setup()
    const write = vi.spyOn(chrome.storage.local, 'set').mockRejectedValue(new Error('storage offline'))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pt_BR' } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Settings could not be saved.')
    expect(screen.getByRole('combobox')).toHaveValue('pt_BR')
    expect((await chrome.storage.local.get(LOCALE_STORAGE_KEY))[LOCALE_STORAGE_KEY]).toMatchObject({ value: 'en' })

    write.mockRestore()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    await act(() => repository.flush())
    expect(screen.getByRole('combobox')).toHaveValue('pt_BR')
    expect((await chrome.storage.local.get(LOCALE_STORAGE_KEY))[LOCALE_STORAGE_KEY]).toMatchObject({ value: 'pt_BR' })
  })

  it('shows a load failure and lets the user select the language again', async () => {
    await chrome.storage.local.set({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'previous-page', value: 'ja' } })
    let frenchAvailable = false
    await setup(async locale => {
      if (locale === 'ja') return { ...EMPTY_MESSAGES, 'popup.languageLoadError': '言語を読み込めませんでした。もう一度選択してください。' }
      if (locale === 'fr' && frenchAvailable) return EMPTY_MESSAGES
      throw new Error('locale assets unavailable')
    })

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fr' } })
    expect(await screen.findByRole('alert')).toHaveTextContent('言語を読み込めませんでした')
    expect(screen.getByRole('combobox')).toHaveValue('ja')
    expect((await chrome.storage.local.get(LOCALE_STORAGE_KEY))[LOCALE_STORAGE_KEY]).toMatchObject({ value: 'ja' })

    frenchAvailable = true
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fr' } })
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('fr'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await waitFor(async () =>
      expect((await chrome.storage.local.get(LOCALE_STORAGE_KEY))[LOCALE_STORAGE_KEY]).toMatchObject({ value: 'fr' }),
    )
  })
})
