import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYLCBgColorChange } from './useYLCBgColorChange'

const setProperties = vi.fn()

vi.mock('./useYLCStylePropertyChange', () => ({
  useYLCStylePropertyChange: () => ({ setProperties }),
}))

describe('useYLCBgColorChange', () => {
  beforeEach(() => {
    setProperties.mockClear()
  })

  it('applies background, darkened, and transparent properties', () => {
    const { result } = renderHook(() => useYLCBgColorChange())

    act(() => {
      result.current.changeColor({ r: 100, g: 120, b: 140, a: 0.8 })
    })

    expect(setProperties).toHaveBeenCalledTimes(1)
    const entries = setProperties.mock.calls[0]?.[0] ?? []
    expect(entries).toContainEqual(['--yt-live-chat-background-color', 'transparent'])
    expect(entries).toContainEqual(['--yt-spec-icon-disabled', 'rgba(60, 80, 100, 0.8)'])
    expect(entries).toContainEqual(['--yt-live-chat-vem-background-color', 'rgba(80, 100, 120, 0.8)'])
    expect(entries).toContainEqual(['--yt-live-chat-header-background-color', 'transparent'])
    expect(entries).toContainEqual(['--yt-spec-general-background-b', 'transparent'])
    expect(entries).toHaveLength(9)
  })
})
