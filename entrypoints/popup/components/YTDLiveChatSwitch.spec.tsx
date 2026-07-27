import { fireEvent } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { beforeEach, describe, expect, it } from 'vitest'
import { globalSettingsStateAtom } from '@/shared/state/atoms'
import { renderWithStore } from '@/shared/state/testUtils'
import { YTDLiveChatSwitch } from './YTDLiveChatSwitch'

const store = createStore()

describe('YTDLiveChatSwitch', () => {
  beforeEach(() => {
    store.set(globalSettingsStateAtom, { ytdLiveChat: true, themeMode: 'system' })
  })

  it('updates the persisted global toggle', () => {
    const { getByRole } = renderWithStore(<YTDLiveChatSwitch />, store)

    fireEvent.click(getByRole('switch'))

    expect(store.get(globalSettingsStateAtom).ytdLiveChat).toBe(false)
  })
})
