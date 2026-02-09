import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGlobalSettingStore } from '@/shared/stores'
import { YTDLiveChatSwitch } from './YTDLiveChatSwitch'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

const baseState = useGlobalSettingStore.getState()

const resetStore = (overrides: Partial<typeof baseState> = {}) => {
  useGlobalSettingStore.setState(
    {
      ...baseState,
      ...overrides,
    },
    true,
  )
}

describe('YTDLiveChatSwitch', () => {
  beforeEach(() => {
    resetStore({ ytdLiveChat: false })
  })

  it('toggles setting when enabled', () => {
    const { getByRole } = render(<YTDLiveChatSwitch />)
    const button = getByRole('button')

    fireEvent.click(button)

    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(true)
    expect(button).toHaveAttribute('aria-disabled', 'false')
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('does not toggle when disabled', () => {
    const { getByRole } = render(<YTDLiveChatSwitch disabled />)
    const button = getByRole('button')

    fireEvent.click(button)

    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(false)
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows inactive pressed state when disabled even if persisted setting is on', () => {
    resetStore({ ytdLiveChat: true })
    const { getByRole } = render(<YTDLiveChatSwitch disabled />)
    const button = getByRole('button')

    expect(button).toHaveAttribute('aria-pressed', 'false')
  })
})
