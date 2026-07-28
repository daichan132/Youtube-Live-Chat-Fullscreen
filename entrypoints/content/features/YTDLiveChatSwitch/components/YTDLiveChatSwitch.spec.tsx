import { fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createStore } from 'jotai/vanilla'
import { beforeEach, describe, expect, it } from 'vitest'
import { globalSettingsStateAtom } from '@/shared/state/atoms'
import { renderWithStore } from '@/shared/state/testUtils'
import { YTDLiveChatSwitch } from './YTDLiveChatSwitch'

const store = createStore()

const resetStore = (overrides: Partial<{ ytdLiveChat: boolean; themeMode: 'light' | 'dark' | 'system' }> = {}) => {
  store.set(globalSettingsStateAtom, { ytdLiveChat: false, themeMode: 'system', ...overrides })
}

describe('YTDLiveChatSwitch', () => {
  beforeEach(() => {
    resetStore({ ytdLiveChat: false })
  })

  it('toggles setting when clicked', () => {
    const { getByRole } = renderWithStore(<YTDLiveChatSwitch />, store)
    const button = getByRole('button')

    fireEvent.click(button)

    expect(store.get(globalSettingsStateAtom).ytdLiveChat).toBe(true)
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('toggles off when persisted setting is on', () => {
    resetStore({ ytdLiveChat: true })
    const { getByRole } = renderWithStore(<YTDLiveChatSwitch />, store)
    const button = getByRole('button')

    fireEvent.click(button)

    expect(store.get(globalSettingsStateAtom).ytdLiveChat).toBe(false)
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('supports native Space and Enter keyboard activation', async () => {
    const user = userEvent.setup()
    const { getByRole } = renderWithStore(<YTDLiveChatSwitch />, store)
    const button = getByRole('button')
    button.focus()

    await user.keyboard('[Space]')
    expect(store.get(globalSettingsStateAtom).ytdLiveChat).toBe(true)
    expect(button).toHaveAttribute('aria-pressed', 'true')

    await user.keyboard('{Enter}')
    expect(store.get(globalSettingsStateAtom).ytdLiveChat).toBe(false)
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })
})
