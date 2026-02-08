import { beforeEach, describe, expect, it } from 'vitest'
import { useYTDLiveChatNoLsStore } from './ytdLiveChatNoLsStore'

const initialState = useYTDLiveChatNoLsStore.getState()

beforeEach(() => {
  useYTDLiveChatNoLsStore.setState({ ...initialState }, true)
})

describe('useYTDLiveChatNoLsStore', () => {
  it('initializes with expected defaults', () => {
    const state = useYTDLiveChatNoLsStore.getState()

    expect(state.isHover).toBe(false)
    expect(state.isDisplay).toBe(true)
    expect(state.isOpenSettingModal).toBe(false)
    expect(state.isIframeLoaded).toBe(false)
    expect(state.isAutoOpeningNativeChat).toBe(false)
    expect(state.clip).toEqual({ header: 0, input: 0 })
    expect(state.isClipPath).toBeUndefined()
    expect(state.iframeElement).toBeNull()
    expect(state.menuItem).toBe('preset')
  })

  it('updates flags and values via setters', () => {
    const state = useYTDLiveChatNoLsStore.getState()

    state.setIsHover(true)
    state.setIsDisplay(false)
    state.setIsOpenSettingModal(true)
    state.setIsIframeLoaded(true)
    state.setIsAutoOpeningNativeChat(true)
    state.setClip({ header: 8, input: 4 })
    state.setIsClipPath(true)
    state.setMenuItem('setting')

    const updated = useYTDLiveChatNoLsStore.getState()

    expect(updated.isHover).toBe(true)
    expect(updated.isDisplay).toBe(false)
    expect(updated.isOpenSettingModal).toBe(true)
    expect(updated.isIframeLoaded).toBe(true)
    expect(updated.isAutoOpeningNativeChat).toBe(true)
    expect(updated.clip).toEqual({ header: 8, input: 4 })
    expect(updated.isClipPath).toBe(true)
    expect(updated.menuItem).toBe('setting')
  })
})
