import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AppProvider } from '@/shared/runtime/AppProvider'
import { createAppRuntime } from '@/shared/runtime/createAppRuntime'
import { createSettingsRepository } from '@/shared/settings/repository'
import { ENABLED_STORAGE_KEY, THEME_STORAGE_KEY } from '@/shared/settings/storageKeys'
import { EMPTY_MESSAGES } from '@/shared/state/atoms'
import { ThemeModeSelector } from './ThemeModeSelector'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

const setup = async () => {
  const repository = createSettingsRepository('theme-popup', null)
  const runtime = await createAppRuntime(repository, { loadMessages: async () => EMPTY_MESSAGES })
  cleanups.push(async () => {
    await repository.flush().catch(() => {})
    runtime.dispose()
  })
  const view = render(
    <AppProvider runtime={runtime}>
      <ThemeModeSelector />
    </AppProvider>,
  )
  return { runtime, repository, view }
}

describe('ThemeModeSelector', () => {
  it('checks and saves the chosen theme independently of the chat toggle, including after reopening', async () => {
    const enabled = { schemaVersion: 1, writerId: 'content-page', value: false }
    await chrome.storage.local.set({ [ENABLED_STORAGE_KEY]: enabled })
    const { runtime, repository, view } = await setup()
    expect(screen.getByRole('radio', { name: 'content.setting.themeMode.system' })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: 'content.setting.themeMode.dark' }))
    expect(screen.getByRole('radio', { name: 'content.setting.themeMode.dark' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'content.setting.themeMode.system' })).not.toBeChecked()
    await act(() => repository.flush())
    expect(await chrome.storage.local.get([THEME_STORAGE_KEY, ENABLED_STORAGE_KEY])).toEqual({
      [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'theme-popup', value: 'dark' },
      [ENABLED_STORAGE_KEY]: enabled,
    })

    view.unmount()
    runtime.dispose()
    await setup()
    expect(screen.getByRole('radio', { name: 'content.setting.themeMode.dark' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'content.setting.themeMode.system' })).not.toBeChecked()
  })
})
