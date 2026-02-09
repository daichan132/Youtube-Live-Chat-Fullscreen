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

  it('toggles setting when clicked', () => {
    const { getByRole } = render(<YTDLiveChatSwitch />)
    const button = getByRole('button')

    fireEvent.click(button)

    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(true)
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('toggles off when persisted setting is on', () => {
    resetStore({ ytdLiveChat: true })
    const { getByRole } = render(<YTDLiveChatSwitch />)
    const button = getByRole('button')

    fireEvent.click(button)

    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(false)
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })
})
