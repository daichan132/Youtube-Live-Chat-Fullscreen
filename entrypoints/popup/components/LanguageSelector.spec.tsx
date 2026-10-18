import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PersistenceNotice } from '@/shared/components/PersistenceNotice'
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

const setup = async () => {
  const repository = createSettingsRepository('language-popup', null, { waitBeforeRetry: async () => {} })
  const runtime = await createAppRuntime(repository, { loadMessages: async () => EMPTY_MESSAGES })
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
})
