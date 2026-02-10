import { fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FontFamilyInputUI } from './FontFamilyInput'

const translate = (key: string) => {
  if (key === 'content.preset.defaultTitle') return 'Default'
  return key
}
const PREVIEW_FONT_STYLE_ID = 'ylc-font-family-preview-style'

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

describe('FontFamilyInputUI', () => {
  beforeEach(() => {
    document.head.querySelector(`#${PREVIEW_FONT_STYLE_ID}`)?.remove()
  })

  afterEach(() => {
    document.head.querySelector(`#${PREVIEW_FONT_STYLE_ID}`)?.remove()
  })

  it('toggles menu visibility from trigger button', () => {
    const { getByRole, queryByTestId } = render(<FontFamilyInputUI value='' onCommit={vi.fn()} />)

    const trigger = getByRole('button', { name: 'content.setting.fontFamily' })
    expect(queryByTestId('font-family-search')).toBeNull()

    fireEvent.click(trigger)
    expect(queryByTestId('font-family-search')).toBeInTheDocument()

    fireEvent.click(trigger)
    expect(queryByTestId('font-family-search')).toBeNull()
  })

  it('filters options using normalized text matching', () => {
    const { container, getByRole, getByTestId } = render(<FontFamilyInputUI value='' onCommit={vi.fn()} />)

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.change(getByTestId('font-family-search'), { target: { value: 'robotoslab' } })

    const options = container.querySelectorAll('[role="option"]')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent('Roboto Slab')
  })

  it('commits highlighted option with Enter key', () => {
    const onCommit = vi.fn()
    const { getByRole, getByTestId } = render(<FontFamilyInputUI value='' onCommit={onCommit} />)

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.change(getByTestId('font-family-search'), { target: { value: 'Roboto Slab' } })
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'Enter' })

    expect(onCommit).toHaveBeenCalledWith('Roboto Slab')
  })

  it('commits custom font when no option matches and Enter is pressed', () => {
    const onCommit = vi.fn()
    const { getByRole, getByTestId } = render(<FontFamilyInputUI value='' onCommit={onCommit} />)

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.change(getByTestId('font-family-search'), { target: { value: 'My Custom Font' } })
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'Enter' })

    expect(onCommit).toHaveBeenCalledWith('My Custom Font')
  })

  it('supports arrow navigation before Enter selection', async () => {
    const onCommit = vi.fn()
    const { container, getByRole, getByTestId } = render(<FontFamilyInputUI value='' onCommit={onCommit} />)

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'ArrowDown' })
    await waitFor(() => {
      const activeOption = container.querySelector('.ylc-font-combobox-option-active')
      expect(activeOption).toHaveTextContent('Roboto')
    })
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'Enter' })

    expect(onCommit).toHaveBeenCalledWith('Roboto')
  })

  it('closes the menu with Escape and outside click', async () => {
    const { getByRole, getByTestId, queryByTestId } = render(<FontFamilyInputUI value='' onCommit={vi.fn()} />)

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

  it('does not open in read-only mode', () => {
    const { getByRole, queryByTestId } = render(<FontFamilyInputUI value='Roboto Slab' onCommit={vi.fn()} readOnly />)

    const trigger = getByRole('button', { name: 'content.setting.fontFamily' })
    expect(trigger).toBeDisabled()

    fireEvent.click(trigger)
    expect(queryByTestId('font-family-search')).toBeNull()
  })

  it('loads preview fonts when menu opens', () => {
    const { getByRole } = render(<FontFamilyInputUI value='' onCommit={vi.fn()} />)

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))

    const styleElement = document.head.querySelector(`#${PREVIEW_FONT_STYLE_ID}`) as HTMLStyleElement | null
    expect(styleElement).not.toBeNull()
    expect(styleElement?.textContent).toContain('family=Roboto&display=swap')
    expect(styleElement?.textContent).toContain('family=Roboto+Slab&display=swap')
  })
})
