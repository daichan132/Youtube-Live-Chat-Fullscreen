import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatStore } from '@/shared/stores/ytdLiveChatStore'
import { useYLCStyleApplication } from './useYLCStyleApplication'

const { changeYLCStyleMock } = vi.hoisted(() => ({
  changeYLCStyleMock: vi.fn(),
}))

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('./ylcStyleApplier', () => ({
  changeYLCStyle: changeYLCStyleMock,
}))

const Observer = () => {
  useYLCStyleApplication()
  return null
}

describe('useYLCStyleApplication', () => {
  beforeEach(() => {
    changeYLCStyleMock.mockClear()
  })

  it('applies only changed style fields and ignores unrelated store updates', () => {
    const { unmount } = render(<Observer />)
    const previousFontSize = useYTDLiveChatStore.getState().fontSize

    act(() => {
      useYTDLiveChatStore.getState().setCoordinates({ x: 10, y: 20 })
    })
    expect(changeYLCStyleMock).not.toHaveBeenCalled()

    act(() => {
      useYTDLiveChatStore.getState().updateYLCStyle({
        fontSize: previousFontSize + 1,
        fontColor: { r: 1, g: 2, b: 3, a: 0.5 },
      })
    })
    expect(changeYLCStyleMock).toHaveBeenCalledOnce()
    expect(changeYLCStyleMock).toHaveBeenCalledWith({
      fontColor: { r: 1, g: 2, b: 3, a: 0.5 },
      fontSize: previousFontSize + 1,
    })

    unmount()
    act(() => {
      useYTDLiveChatStore.getState().updateYLCStyle({ fontSize: previousFontSize + 2 })
    })
    expect(changeYLCStyleMock).toHaveBeenCalledOnce()
  })
})
