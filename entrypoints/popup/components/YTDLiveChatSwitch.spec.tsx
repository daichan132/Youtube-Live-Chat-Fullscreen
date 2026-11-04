import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppProvider } from '@/shared/runtime/AppProvider'
import { type AppRuntime, createAppRuntime } from '@/shared/runtime/createAppRuntime'
import { createSettingsRepository, type SettingsRepository } from '@/shared/settings/repository'
import { ENABLED_STORAGE_KEY, THEME_STORAGE_KEY } from '@/shared/settings/storageKeys'
import { EMPTY_MESSAGES } from '@/shared/state/atoms'
import { PopupItemRow } from './PopupItemRow'
import { YTDLiveChatSwitch } from './YTDLiveChatSwitch'

const sessions: { runtime: AppRuntime; repository: SettingsRepository }[] = []

const openPopup = async () => {
  const repository = createSettingsRepository('popup', null)
  const runtime = await createAppRuntime(repository, { loadMessages: async () => EMPTY_MESSAGES })
  sessions.push({ runtime, repository })
  const view = render(
    <AppProvider runtime={runtime}>
      <PopupItemRow title='Show chat' data={<YTDLiveChatSwitch />} asLabel />
    </AppProvider>,
  )
  return { view, repository, runtime }
}

beforeEach(async () => {
  await chrome.storage.local.clear()
})

afterEach(async () => {
  await Promise.allSettled(sessions.map(({ repository }) => repository.flush()))
  for (const { runtime } of sessions.splice(0)) runtime.dispose()
})

describe('popup chat switch', () => {
  it('saves the chosen state independently of the theme and shows it when reopened', async () => {
    const user = userEvent.setup()
    const theme = { schemaVersion: 1, writerId: 'other-page', value: 'dark' }
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: theme })
    const { view, repository, runtime } = await openPopup()
    const toggle = screen.getByRole('switch', { name: 'Show chat' })
    expect(toggle).toBeChecked()

    await user.click(toggle)
    expect(toggle).not.toBeChecked()
    await act(() => repository.flush())
    expect(await chrome.storage.local.get([ENABLED_STORAGE_KEY, THEME_STORAGE_KEY])).toEqual({
      [ENABLED_STORAGE_KEY]: { schemaVersion: 1, writerId: 'popup', value: false },
      [THEME_STORAGE_KEY]: theme,
    })

    view.unmount()
    runtime.dispose()
    await openPopup()
    expect(screen.getByRole('switch', { name: 'Show chat' })).not.toBeChecked()
  })
})
