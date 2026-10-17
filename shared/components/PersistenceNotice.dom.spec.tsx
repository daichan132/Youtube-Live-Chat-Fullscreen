import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppProvider } from '@/shared/runtime/AppProvider'
import { type AppRuntime, createAppRuntime } from '@/shared/runtime/createAppRuntime'
import { createSettingsRepository, type SettingsRepository } from '@/shared/settings/repository'
import { APPEARANCE_STORAGE_KEY } from '@/shared/settings/storageKeys'
import { EMPTY_MESSAGES } from '@/shared/state/atoms'
import { commitStylePatchAtom } from '@/shared/state/commands'
import { PersistenceNotice } from './PersistenceNotice'

let runtime: AppRuntime | undefined
let repository: SettingsRepository | undefined

beforeEach(async () => {
  await chrome.storage.local.clear()
})

afterEach(async () => {
  await repository?.flush().catch(() => {})
  runtime?.dispose()
  runtime = undefined
  repository = undefined
  vi.restoreAllMocks()
})

it('keeps a failed save visible until Retry saves the chosen settings', async () => {
  repository = createSettingsRepository('notice-editor', null, { waitBeforeRetry: async () => {} })
  runtime = await createAppRuntime(repository, { loadMessages: async () => EMPTY_MESSAGES })
  const store = runtime.store
  let offline = true
  const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
  vi.spyOn(chrome.storage.local, 'set').mockImplementation(async values => {
    if (offline) throw new Error('storage unavailable')
    await originalSet(values)
  })
  render(
    <AppProvider runtime={runtime}>
      <PersistenceNotice />
    </AppProvider>,
  )
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()

  act(() => store.set(commitStylePatchAtom, { appearance: { fontSize: 27 } }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Settings could not be saved.')
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled())
  expect(screen.getByRole('alert')).toHaveTextContent('Settings could not be saved.')

  offline = false
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  await repository.flush()
  expect((await chrome.storage.local.get(APPEARANCE_STORAGE_KEY))[APPEARANCE_STORAGE_KEY]).toMatchObject({
    value: { profile: { appearance: { fontSize: 27 } } },
  })
})
