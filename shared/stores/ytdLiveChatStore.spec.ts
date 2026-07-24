import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResizableMinHeight, ResizableMinWidth } from '../constants'
import { DEFAULT_MEMBERSHIP_NAME_COLOR, ylcInitSetting } from '../utils'

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
    expect(state.presetItemIds).toEqual(['default1', 'default2', 'default3', 'default4', 'default5', 'default6', 'default7'])
    expect(state.presetItemTitles.default1).toBe('content.preset.defaultTitle')
    expect(state.presetItemTitles.default2).toBe('content.preset.transparentTitle')
    expect(state.presetItemTitles.default3).toBe('content.preset.simpleTitle')
    expect(state.presetItemTitles.default4).toBe('content.preset.darkTitle')
    expect(state.presetItemTitles.default5).toBe('content.preset.readableTitle')
    expect(state.presetItemTitles.default6).toBe('content.preset.compactTitle')
    expect(state.presetItemTitles.default7).toBe('content.preset.neonTitle')
    expect(state.membershipNameColor).toEqual(DEFAULT_MEMBERSHIP_NAME_COLOR)
    expect(state.presetItemStyles.default1?.membershipNameColor).toEqual(DEFAULT_MEMBERSHIP_NAME_COLOR)
    expect(state.presetItemStyles.default4?.fontFamily).toBe('Inter')
    expect(state.presetItemStyles.default5?.fontSize).toBe(18)
    expect(state.presetItemStyles.default5?.userNameDisplay).toBe(false)
    expect(state.presetItemStyles.default5?.fontFamily).toBe('BIZ UDPGothic')
    expect(state.presetItemStyles.default6?.chatOnlyDisplay).toBe(true)
    expect(state.presetItemStyles.default7?.fontColor).toEqual({ r: 217, g: 249, b: 157, a: 1 })
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

  it('migrates invalid fontFamily values in root and presets to default', async () => {
    localStorage.setItem(
      'ytdLiveChatStore',
      JSON.stringify({
        state: {
          ...ylcInitSetting,
          fontFamily: 'NotInListFont',
          presetItemIds: ['legacy'],
          presetItemTitles: { legacy: 'Legacy' },
          presetItemStyles: {
            legacy: {
              ...ylcInitSetting,
              fontFamily: 'Unknown Font',
            },
          },
        },
        version: 1,
      }),
    )

    const { useYTDLiveChatStore } = await import('./ytdLiveChatStore')
    const state = useYTDLiveChatStore.getState()

    expect(state.fontFamily).toBe('')
    expect(state.presetItemStyles.legacy?.fontFamily).toBe('')
  })

  it('migrates missing or invalid membership name colors to the default color', async () => {
    localStorage.setItem(
      'ytdLiveChatStore',
      JSON.stringify({
        state: {
          ...ylcInitSetting,
          membershipNameColor: 'green',
          presetItemIds: ['legacy'],
          presetItemTitles: { legacy: 'Legacy' },
          presetItemStyles: {
            legacy: {
              ...ylcInitSetting,
              membershipNameColor: 'invalid',
            },
          },
        },
        version: 4,
      }),
    )

    const { useYTDLiveChatStore } = await import('./ytdLiveChatStore')
    const state = useYTDLiveChatStore.getState()

    expect(state.membershipNameColor).toEqual(DEFAULT_MEMBERSHIP_NAME_COLOR)
    expect(state.presetItemStyles.legacy?.membershipNameColor).toEqual(DEFAULT_MEMBERSHIP_NAME_COLOR)
  })

  it('keeps valid membership name colors during migration', async () => {
    localStorage.setItem(
      'ytdLiveChatStore',
      JSON.stringify({
        state: {
          ...ylcInitSetting,
          membershipNameColor: { r: 1, g: 2, b: 3, a: 0.4 },
          presetItemIds: ['legacy'],
          presetItemTitles: { legacy: 'Legacy' },
          presetItemStyles: {
            legacy: {
              ...ylcInitSetting,
              membershipNameColor: { r: 5, g: 6, b: 7 },
            },
          },
        },
        version: 4,
      }),
    )

    const { useYTDLiveChatStore } = await import('./ytdLiveChatStore')
    const state = useYTDLiveChatStore.getState()

    expect(state.membershipNameColor).toEqual({ r: 1, g: 2, b: 3, a: 0.4 })
    expect(state.presetItemStyles.legacy?.membershipNameColor).toEqual({ r: 5, g: 6, b: 7, a: 1 })
  })

  it('migrates persisted default presets back to current built-in definitions', async () => {
    localStorage.setItem(
      'ytdLiveChatStore',
      JSON.stringify({
        state: {
          ...ylcInitSetting,
          presetItemIds: ['default1', 'default2', 'default3'],
          presetItemTitles: { default1: '', default2: 'Transparent', default3: 'Simple' },
          presetItemStyles: {
            default1: ylcInitSetting,
            default2: ylcInitSetting,
            default3: ylcInitSetting,
          },
        },
        version: 1,
      }),
    )

    const { useYTDLiveChatStore } = await import('./ytdLiveChatStore')
    const state = useYTDLiveChatStore.getState()

    expect(state.presetItemTitles.default1).toBe('content.preset.defaultTitle')
    expect(state.presetItemTitles.default2).toBe('content.preset.transparentTitle')
    expect(state.presetItemTitles.default3).toBe('content.preset.simpleTitle')
    expect(state.presetItemTitles.default4).toBe('content.preset.darkTitle')
    expect(state.presetItemStyles.default2?.blur).toBe(16)
    expect(state.presetItemStyles.default3?.userIconDisplay).toBe(false)
    expect(state.presetItemIds).toContain('default7')
    expect(state.presetItemStyles.default7?.fontFamily).toBe('M PLUS Rounded 1c')
  })

  it('adds new default presets to legacy persisted preset lists', async () => {
    localStorage.setItem(
      'ytdLiveChatStore',
      JSON.stringify({
        state: {
          ...ylcInitSetting,
          presetItemIds: ['default1', 'custom'],
          presetItemTitles: { default1: 'Custom Default', custom: 'Custom' },
          presetItemStyles: { default1: ylcInitSetting, custom: ylcInitSetting },
        },
        version: 2,
      }),
    )

    const { useYTDLiveChatStore } = await import('./ytdLiveChatStore')
    const state = useYTDLiveChatStore.getState()

    expect(state.presetItemIds).toEqual(['default1', 'custom', 'default4', 'default5', 'default6', 'default7'])
    expect(state.presetItemTitles.default1).toBe('content.preset.defaultTitle')
    expect(state.presetItemTitles.default4).toBe('content.preset.darkTitle')
    expect(state.presetItemStyles.default5?.fontSize).toBe(18)
  })

  it('keeps custom-only persisted preset lists without adding built-in defaults', async () => {
    localStorage.setItem(
      'ytdLiveChatStore',
      JSON.stringify({
        state: {
          ...ylcInitSetting,
          presetItemIds: ['custom'],
          presetItemTitles: { custom: 'Custom' },
          presetItemStyles: { custom: { ...ylcInitSetting, fontSize: 20 } },
        },
        version: 3,
      }),
    )

    const { useYTDLiveChatStore } = await import('./ytdLiveChatStore')
    const state = useYTDLiveChatStore.getState()

    expect(state.presetItemIds).toEqual(['custom'])
    expect(state.presetItemTitles).toEqual({ custom: 'Custom' })
    expect(state.presetItemStyles.custom?.fontSize).toBe(20)
  })

  it('drops custom preset ids whose persisted style is missing', async () => {
    localStorage.setItem(
      'ytdLiveChatStore',
      JSON.stringify({
        state: {
          ...ylcInitSetting,
          presetItemIds: ['valid', 'missing'],
          presetItemTitles: { valid: 'Valid', missing: 'Missing' },
          presetItemStyles: { valid: { ...ylcInitSetting, fontSize: 20 } },
        },
        version: 5,
      }),
    )

    const { useYTDLiveChatStore } = await import('./ytdLiveChatStore')
    const state = useYTDLiveChatStore.getState()

    expect(state.presetItemIds).toEqual(['valid'])
    expect(state.presetItemStyles.missing).toBeUndefined()
    expect(state.presetItemTitles.missing).toBeUndefined()
  })

  it('normalizes and saves fontFamily in updateYLCStyle', async () => {
    const { useYTDLiveChatStore } = await import('./ytdLiveChatStore')
    const state = useYTDLiveChatStore.getState()

    state.updateYLCStyle({ fontFamily: '  roboto slab  ' })
    expect(useYTDLiveChatStore.getState().fontFamily).toBe('Roboto Slab')

    state.updateYLCStyle({ fontFamily: 'NotInListFont' })
    expect(useYTDLiveChatStore.getState().fontFamily).toBe('')
  })

  it('sanitizes fontFamily when adding preset item', async () => {
    const { useYTDLiveChatStore } = await import('./ytdLiveChatStore')
    const state = useYTDLiveChatStore.getState()

    state.addPresetItem('invalid-font', 'Invalid Font', {
      ...ylcInitSetting,
      fontFamily: 'NotInListFont',
    })
    state.addPresetItem('normalized-font', 'Normalized Font', {
      ...ylcInitSetting,
      fontFamily: '  roboto   slab ',
    })

    const updated = useYTDLiveChatStore.getState()
    expect(updated.presetItemStyles['invalid-font']?.fontFamily).toBe('')
    expect(updated.presetItemStyles['normalized-font']?.fontFamily).toBe('Roboto Slab')
  })
})
