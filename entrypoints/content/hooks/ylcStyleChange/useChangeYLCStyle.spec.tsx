import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChangeYLCStyle } from './useChangeYLCStyle'

const spies = vi.hoisted(() => ({
  changeBg: vi.fn(),
  changeBlur: vi.fn(),
  changeFontColor: vi.fn(),
  changeFontFamily: vi.fn(),
  setProperty: vi.fn(),
  changeUserNameDisplay: vi.fn(),
  changeUserIconDisplay: vi.fn(),
  changeSuperChatBarDisplay: vi.fn(),
}))

vi.mock('./useYLCBgColorChange', () => ({
  useYLCBgColorChange: () => ({ changeColor: spies.changeBg }),
}))
vi.mock('./useYLCBlurChange', () => ({
  useYLCBlurChange: () => ({ changeBlur: spies.changeBlur }),
}))
vi.mock('./useYLCFontColorChange', () => ({
  useYLCFontColorChange: () => ({ changeColor: spies.changeFontColor }),
}))
vi.mock('./useYLCFontFamilyChange', () => ({
  useYLCFontFamilyChange: () => ({ changeFontFamily: spies.changeFontFamily }),
}))
vi.mock('./useYLCStylePropertyChange', () => ({
  useYLCStylePropertyChange: () => ({ setProperty: spies.setProperty }),
}))
vi.mock('./useYLCDisplayChange', () => ({
  useYLCDisplayChange: (property: string, _visibleValue = 'inline') => ({
    changeDisplay: (display: boolean) => {
      if (property === '--extension-user-name-display') spies.changeUserNameDisplay(display)
      else if (property === '--extension-user-icon-display') spies.changeUserIconDisplay(display)
      else if (property === '--extension-super-chat-bar-display') spies.changeSuperChatBarDisplay(display)
    },
  }),
}))

describe('useChangeYLCStyle', () => {
  beforeEach(() => {
    for (const spy of Object.values(spies)) {
      spy.mockClear()
    }
  })

  it('calls only the handlers for provided values', () => {
    const { result } = renderHook(() => useChangeYLCStyle())

    act(() => {
      result.current({
        bgColor: { r: 10, g: 20, b: 30, a: 0.9 },
        fontSize: 18,
        userNameDisplay: false,
      })
    })

    expect(spies.changeBg).toHaveBeenCalledWith({ r: 10, g: 20, b: 30, a: 0.9 })
    expect(spies.setProperty).toHaveBeenCalledWith('--extension-yt-live-chat-font-size', '18px')
    expect(spies.changeUserNameDisplay).toHaveBeenCalledWith(false)

    expect(spies.changeBlur).not.toHaveBeenCalled()
    expect(spies.changeFontColor).not.toHaveBeenCalled()
    expect(spies.changeFontFamily).not.toHaveBeenCalled()
    expect(spies.changeUserIconDisplay).not.toHaveBeenCalled()
    expect(spies.changeSuperChatBarDisplay).not.toHaveBeenCalled()
  })
})
