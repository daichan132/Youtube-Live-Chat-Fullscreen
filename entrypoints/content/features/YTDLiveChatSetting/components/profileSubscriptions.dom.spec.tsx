import { act } from '@testing-library/react'
import { Profiler } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR } from '@/shared/settings/defaults'
import { chatSettingsStateAtom, editorSessionStateAtom, replaceExternalAppearanceAtom } from '@/shared/state/atoms'
import {
  applyPresetAtom,
  beginStyleGestureAtom,
  cancelStyleGestureAtom,
  finishStyleGestureAtom,
  previewStylePatchAtom,
} from '@/shared/state/commands'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { SettingContent } from './SettingContent'

const commits = vi.hoisted(() => new Map<string, number>())
const countCommit = (id: string) => commits.set(id, (commits.get(id) ?? 0) + 1)

vi.mock('./YLCChangeItems/YLCNumberSlider', async importOriginal => {
  const actual = await importOriginal<typeof import('./YLCChangeItems/YLCNumberSlider')>()
  return {
    YLCNumberSlider: (props: Parameters<typeof actual.YLCNumberSlider>[0]) => (
      <Profiler id={props.settingKey} onRender={countCommit}>
        <actual.YLCNumberSlider {...props} />
      </Profiler>
    ),
  }
})

vi.mock('./YLCChangeItems/YLCColorPicker', async importOriginal => {
  const actual = await importOriginal<typeof import('./YLCChangeItems/YLCColorPicker')>()
  return {
    YLCColorPicker: (props: Parameters<typeof actual.YLCColorPicker>[0]) => (
      <Profiler id={props.settingKey} onRender={countCommit}>
        <actual.YLCColorPicker {...props} />
      </Profiler>
    ),
  }
})

vi.mock('./YLCChangeItems/FontFamilyInput', async importOriginal => {
  const actual = await importOriginal<typeof import('./YLCChangeItems/FontFamilyInput')>()
  return {
    FontFamilyInput: () => (
      <Profiler id='fontFamily' onRender={countCommit}>
        <actual.FontFamilyInput />
      </Profiler>
    ),
  }
})

describe('settings control subscriptions', () => {
  beforeEach(() => commits.clear())

  it('updates only the font-size control throughout a slider gesture in the full settings panel', () => {
    const store = createTestStore()
    const { getByRole } = renderWithStore(<SettingContent />, store)
    act(() => store.set(beginStyleGestureAtom, 'font-size'))
    commits.clear()

    for (let fontSize = 20; fontSize < 40; fontSize++) {
      act(() => store.set(previewStylePatchAtom, { id: 'font-size', patch: { appearance: { fontSize } } }))
    }

    expect(Object.fromEntries(commits)).toEqual({ fontSize: 20 })
    expect(getByRole('slider', { name: 'content.setting.fontSize' })).toHaveValue('39')
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(13)

    act(() => store.set(finishStyleGestureAtom, 'font-size'))
    expect(Object.fromEntries(commits)).toEqual({ fontSize: 20 })
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(39)
    expect(store.get(editorSessionStateAtom).past).toHaveLength(1)
  })

  it('updates only the changed color despite normalizing all profile colors during previews', () => {
    const store = createTestStore()
    renderWithStore(<SettingContent />, store)
    act(() => store.set(beginStyleGestureAtom, 'font-color'))
    commits.clear()

    for (let r = 1; r <= 20; r++) {
      act(() => store.set(previewStylePatchAtom, { id: 'font-color', patch: { appearance: { fontColor: { r, g: 0, b: 0, a: 1 } } } }))
    }

    expect(Object.fromEntries(commits)).toEqual({ fontColor: 20 })
  })

  it('continues reflecting draft cancellation, external commits and preset application', () => {
    const store = createTestStore()
    const { getByRole, getByText } = renderWithStore(<SettingContent />, store)
    const original = store.get(chatSettingsStateAtom).profile
    act(() => store.set(previewStylePatchAtom, { id: 'font-size', patch: { appearance: { fontSize: 30 } } }))
    expect(getByRole('slider', { name: 'content.setting.fontSize' })).toHaveValue('30')

    act(() => store.set(cancelStyleGestureAtom))
    expect(getByRole('slider', { name: 'content.setting.fontSize' })).toHaveValue('13')

    const externalProfile = {
      ...original,
      appearance: {
        ...original.appearance,
        fontSize: 25,
        membershipNameColor: { mode: 'custom' as const, value: { r: 1, g: 2, b: 3, a: 1 } },
      },
      display: { idleVisibility: 'auto-hide' as const, contentMode: 'messages-only' as const },
    }
    act(() => store.set(replaceExternalAppearanceAtom, { profile: externalProfile, presets: store.get(chatSettingsStateAtom).presets }))
    expect(getByRole('slider', { name: 'content.setting.fontSize' })).toHaveValue('25')
    expect(getByRole('switch', { name: 'content.setting.alwaysOnDisplay' })).not.toBeChecked()
    expect(getByText('Current color: rgba(1, 2, 3, 1)')).toBeInTheDocument()
    expect(getByRole('button', { name: 'content.setting.resetToDefaultColor' })).toBeEnabled()

    act(() => store.set(applyPresetAtom, original))
    expect(getByRole('slider', { name: 'content.setting.fontSize' })).toHaveValue('13')
    expect(getByRole('switch', { name: 'content.setting.alwaysOnDisplay' })).toBeChecked()
    expect(getByRole('button', { name: 'content.setting.resetToDefaultColor' })).toBeDisabled()
    const { r, g, b, a } = LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR
    expect(getByText(`Current color: rgba(${r}, ${g}, ${b}, ${a})`)).toBeInTheDocument()
  })
})
