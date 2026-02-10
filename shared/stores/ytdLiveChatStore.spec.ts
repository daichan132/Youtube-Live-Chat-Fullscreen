import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResizableMinHeight, ResizableMinWidth } from '../constants'
import { ylcInitSetting } from '../utils'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('../i18n/config', () => ({
  default: {
    t: (key: string) => key,
  },
}))

describe('useYTDLiveChatStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('initializes default layout and presets', async () => {
    const { useYTDLiveChatStore } = await import('./ytdLiveChatStore')
    const state = useYTDLiveChatStore.getState()

    expect(state.coordinates).toEqual({ x: 20, y: 20 })
    expect(state.size).toEqual({ width: 400, height: 400 })
    expect(state.presetItemIds).toEqual(['default1', 'default2', 'default3'])
    expect(state.presetItemTitles.default1).toBe('content.preset.defaultTitle')
    expect(state.presetItemTitles.default2).toBe('content.preset.transparentTitle')
    expect(state.presetItemTitles.default3).toBe('content.preset.simpleTitle')
  })

  it('adds and removes preset items', async () => {
    const { useYTDLiveChatStore } = await import('./ytdLiveChatStore')
    const state = useYTDLiveChatStore.getState()

    state.addPresetItem('custom', 'Custom', ylcInitSetting)

    const added = useYTDLiveChatStore.getState()
    expect(added.addPresetEnabled).toBe(false)
    expect(added.presetItemIds).toContain('custom')
    expect(added.presetItemTitles.custom).toBe('Custom')

    state.deletePresetItem('custom')

    const updated = useYTDLiveChatStore.getState()
    expect(updated.presetItemIds).not.toContain('custom')
    expect(updated.presetItemTitles.custom).toBeUndefined()
  })

  it('enforces minimum size and updates coordinates', async () => {
    const { useYTDLiveChatStore } = await import('./ytdLiveChatStore')
    const state = useYTDLiveChatStore.getState()

    state.setSize({ width: 100, height: 100 })
    state.setCoordinates({ x: 48, y: 64 })

    const updated = useYTDLiveChatStore.getState()
    expect(updated.size).toEqual({ width: ResizableMinWidth, height: ResizableMinHeight })
    expect(updated.coordinates).toEqual({ x: 48, y: 64 })
  })

  it('updates geometry atomically with min-size enforcement', async () => {
    const { useYTDLiveChatStore } = await import('./ytdLiveChatStore')
    const state = useYTDLiveChatStore.getState()

    state.setGeometry({
      coordinates: { x: 120, y: 160 },
      size: { width: 20, height: 30 },
    })

    const updated = useYTDLiveChatStore.getState()
    expect(updated.coordinates).toEqual({ x: 120, y: 160 })
    expect(updated.size).toEqual({ width: ResizableMinWidth, height: ResizableMinHeight })
  })

  it('resets position and enables preset updates on style change', async () => {
    const { useYTDLiveChatStore } = await import('./ytdLiveChatStore')
    const state = useYTDLiveChatStore.getState()

    state.setSize({ width: 640, height: 360 })
    state.setCoordinates({ x: 10, y: 10 })
    state.updateYLCStyle({ fontSize: 18 })

    const updated = useYTDLiveChatStore.getState()
    expect(updated.fontSize).toBe(18)
    expect(updated.addPresetEnabled).toBe(true)

    state.setDefaultPosition()
    const reset = useYTDLiveChatStore.getState()
    expect(reset.size).toEqual({ width: 400, height: 400 })
    expect(reset.coordinates).toEqual({ x: 20, y: 20 })
  })

  it('migrates legacy persisted data that still contains reactionButtonDisplay', async () => {
    const legacyStyle = {
      ...ylcInitSetting,
      reactionButtonDisplay: false,
    }

    localStorage.setItem(
      'ytdLiveChatStore',
      JSON.stringify({
        state: {
          ...ylcInitSetting,
          reactionButtonDisplay: true,
          presetItemIds: ['legacy'],
          presetItemTitles: { legacy: 'Legacy' },
          presetItemStyles: { legacy: legacyStyle },
        },
        version: 0,
      }),
    )

    const { useYTDLiveChatStore } = await import('./ytdLiveChatStore')
    const state = useYTDLiveChatStore.getState() as unknown as Record<string, unknown>
    const presetStyles = state.presetItemStyles as Record<string, Record<string, unknown>>

    expect('reactionButtonDisplay' in state).toBe(false)
    expect('reactionButtonDisplay' in presetStyles.legacy).toBe(false)
  })
})
