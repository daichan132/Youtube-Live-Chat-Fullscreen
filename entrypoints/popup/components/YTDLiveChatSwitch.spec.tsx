import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGlobalSettingStore } from '@/shared/stores'
import { YTDLiveChatSwitch } from './YTDLiveChatSwitch'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

const baseState = useGlobalSettingStore.getState()

describe('YTDLiveChatSwitch', () => {
  beforeEach(() => {
    useGlobalSettingStore.setState(baseState, true)
  })

  it('updates the persisted global toggle', () => {
    const { getByRole } = render(<YTDLiveChatSwitch />)

    fireEvent.click(getByRole('switch'))

    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(false)
  })
})
