import { fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatStore } from '@/shared/stores'
import { FontFamilyInput } from './FontFamilyInput'

const { changeFontFamilyMock } = vi.hoisted(() => ({
  changeFontFamilyMock: vi.fn(),
}))

const translate = (key: string) => {
  if (key === 'content.preset.defaultTitle') return 'Default'
  return key
}
const PREVIEW_FONT_STYLE_ID = 'ylc-font-family-preview-style'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('@/entrypoints/content/hooks/ylcStyleChange/ylcStyleApplier', () => ({
  changeYLCFontFamily: changeFontFamilyMock,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: translate,
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

const dispatchMouseDown = (target: EventTarget, path: EventTarget[]) => {
  const outsideEvent = new MouseEvent('mousedown', { bubbles: true })
  Object.defineProperty(outsideEvent, 'composedPath', {
    value: () => path,
  })
  target.dispatchEvent(outsideEvent)
}

const baseState = useYTDLiveChatStore.getState()

const resetStore = (overrides: Partial<typeof baseState> = {}) => {
  useYTDLiveChatStore.setState(
    {
      ...baseState,
      ...overrides,
      coordinates: { ...baseState.coordinates },
      size: { ...baseState.size },
      presetItemIds: [...baseState.presetItemIds],
      presetItemStyles: { ...baseState.presetItemStyles },
      presetItemTitles: { ...baseState.presetItemTitles },
    },
    true,
  )
}

const renderFontFamilyInput = (fontFamily = '') => {
  resetStore({ fontFamily })
  return render(<FontFamilyInput />)
}

describe('FontFamilyInput', () => {
  beforeEach(() => {
    document.head.querySelector(`#${PREVIEW_FONT_STYLE_ID}`)?.remove()
    changeFontFamilyMock.mockClear()
    resetStore()
  })

  afterEach(() => {
    document.head.querySelector(`#${PREVIEW_FONT_STYLE_ID}`)?.remove()
  })

  it('toggles menu visibility from trigger button', () => {
    const { getByRole, queryByTestId } = renderFontFamilyInput()

    const trigger = getByRole('button', { name: 'content.setting.fontFamily' })
    expect(queryByTestId('font-family-search')).toBeNull()

    fireEvent.click(trigger)
    expect(queryByTestId('font-family-search')).toBeInTheDocument()

    fireEvent.click(trigger)
    expect(queryByTestId('font-family-search')).toBeNull()
  })

  it('filters options using normalized text matching', () => {
    const { container, getByRole, getByTestId } = renderFontFamilyInput()

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.change(getByTestId('font-family-search'), { target: { value: 'robotoslab' } })

    const options = container.querySelectorAll('[role="option"]')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent('Roboto Slab')
  })

  it('commits highlighted option with Enter key', () => {
    const { getByRole, getByTestId } = renderFontFamilyInput()

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.change(getByTestId('font-family-search'), { target: { value: 'Roboto Slab' } })
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'Enter' })

    expect(useYTDLiveChatStore.getState().fontFamily).toBe('Roboto Slab')
    expect(changeFontFamilyMock).toHaveBeenCalledWith('Roboto Slab')
  })

  it('commits default when no option matches and Enter is pressed', () => {
    const { getByRole, getByTestId } = renderFontFamilyInput('Roboto')

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.change(getByTestId('font-family-search'), { target: { value: 'My Custom Font' } })
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'Enter' })

    expect(useYTDLiveChatStore.getState().fontFamily).toBe('')
    expect(changeFontFamilyMock).toHaveBeenCalledWith('')
  })

  it('normalizes a case-insensitive font input before committing', () => {
    const { getByRole, getByTestId } = renderFontFamilyInput()

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.change(getByTestId('font-family-search'), { target: { value: 'roboto' } })
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'Enter' })

    expect(useYTDLiveChatStore.getState().fontFamily).toBe('Roboto')
    expect(changeFontFamilyMock).toHaveBeenCalledWith('Roboto')
  })

  it('supports arrow navigation before Enter selection', async () => {
    const { container, getByRole, getByTestId } = renderFontFamilyInput()

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'ArrowDown' })
    await waitFor(() => {
      const activeOption = container.querySelector('.ylc-font-combobox-option-active')
      expect(activeOption).toHaveTextContent('Roboto')
    })
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'Enter' })

    expect(useYTDLiveChatStore.getState().fontFamily).toBe('Roboto')
    expect(changeFontFamilyMock).toHaveBeenCalledWith('Roboto')
  })

  it('closes the menu with Escape and outside click', async () => {
    const { getByRole, getByTestId, queryByTestId } = renderFontFamilyInput()

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'Escape' })
    expect(queryByTestId('font-family-search')).toBeNull()

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    expect(getByTestId('font-family-search')).toBeInTheDocument()
    dispatchMouseDown(document.body, [document.body])
    await waitFor(() => {
      expect(queryByTestId('font-family-search')).toBeNull()
    })
  })

  it('shows default label for invalid stored value', () => {
    const { getByRole } = renderFontFamilyInput('NotInListFont')

    const trigger = getByRole('button', { name: 'content.setting.fontFamily' })
    expect(trigger).toHaveTextContent('Default')
  })

  it('loads preview fonts when menu opens', () => {
    const { getByRole } = renderFontFamilyInput()

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))

    const styleElement = document.head.querySelector(`#${PREVIEW_FONT_STYLE_ID}`) as HTMLStyleElement | null
    expect(styleElement).not.toBeNull()
    expect(styleElement?.textContent).toContain('family=Roboto&display=swap')
    expect(styleElement?.textContent).toContain('family=Roboto+Slab&display=swap')
  })
})
