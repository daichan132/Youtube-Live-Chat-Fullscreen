import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGlobalSettingStore } from '@/shared/stores'
import { YTDLiveChatSwitch } from './YTDLiveChatSwitch'

const sendActiveTabMessage = vi.hoisted(() => vi.fn())

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('../utils/sendActiveTabMessage', () => ({
  sendActiveTabMessage,
}))

const baseState = useGlobalSettingStore.getState()

describe('YTDLiveChatSwitch', () => {
  beforeEach(() => {
    sendActiveTabMessage.mockClear()
    useGlobalSettingStore.setState(baseState, true)
  })

  it('updates the global toggle and sends the ytdLiveChat payload', () => {
    const { getByRole } = render(<YTDLiveChatSwitch />)

    fireEvent.click(getByRole('switch'))

    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(false)
    expect(sendActiveTabMessage).toHaveBeenCalledWith({ message: 'ytdLiveChat', ytdLiveChat: false })
  })
})
