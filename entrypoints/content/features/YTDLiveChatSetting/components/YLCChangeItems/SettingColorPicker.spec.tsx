import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingColorPicker } from './SettingColorPicker'

describe('SettingColorPicker', () => {
  it('describes the current color and isolates technical values in a right-to-left field', () => {
    const { getByRole, getByText } = render(
      <div dir='rtl'>
        <SettingColorPicker rgba={{ r: 1, g: 2, b: 3, a: 0.4 }} label='Background color' onChange={vi.fn()} />
      </div>,
    )
    const trigger = getByRole('button', { name: 'Background color' })
    expect(trigger).toHaveAccessibleDescription('rgba(1, 2, 3, 0.4)')
    expect(getByText('#010203 · 40%').closest('[dir]')).toHaveAttribute('dir', 'ltr')
    expect(document.getElementById(trigger.getAttribute('aria-describedby') ?? '')).toHaveAttribute('dir', 'ltr')
  })

  it('renders the color picker dialog only while open', () => {
    const { getByRole, queryByRole } = render(
      <SettingColorPicker rgba={{ r: 1, g: 2, b: 3, a: 0.4 }} label='Background color' onChange={vi.fn()} />,
    )

    const trigger = getByRole('button', { name: 'Background color' })
    expect(queryByRole('dialog')).toBeNull()
    expect(trigger).not.toHaveAttribute('aria-controls')

    fireEvent.click(trigger)
    const dialog = getByRole('dialog', { name: 'content.aria.colorPicker' })
    expect(dialog).toHaveClass('ylc-theme-popover')
    expect(dialog).toHaveAccessibleDescription('Background color')
    expect(dialog.id).not.toBe('')
    expect(trigger).toHaveAttribute('aria-controls', dialog.id)
    const hue = getByRole('slider', { name: 'Hue' })
    expect(hue.closest('[lang]')).toHaveAttribute('lang', 'en')
    expect(hue.closest('[dir]')).toHaveAttribute('dir', 'ltr')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(queryByRole('dialog')).toBeNull()
    expect(trigger).not.toHaveAttribute('aria-controls')
  })

  it('ends the interaction once when Escape closes the picker', () => {
    const onInteractionEnd = vi.fn()
    const { getByRole, queryByRole } = render(
      <SettingColorPicker
        rgba={{ r: 1, g: 2, b: 3, a: 0.4 }}
        label='Background color'
        onChange={vi.fn()}
        onInteractionEnd={onInteractionEnd}
      />,
    )

    fireEvent.click(getByRole('button', { name: 'Background color' }))
    fireEvent.keyDown(getByRole('slider', { name: 'Hue' }), { key: 'Escape' })

    expect(queryByRole('dialog')).not.toBeInTheDocument()
    expect(onInteractionEnd).toHaveBeenCalledOnce()
  })

  it('closes the dialog on outside click', () => {
    const { getByRole, queryByRole } = render(
      <div>
        <SettingColorPicker rgba={{ r: 1, g: 2, b: 3, a: 0.4 }} label='Background color' onChange={vi.fn()} />
        <button type='button'>Outside</button>
      </div>,
    )

    fireEvent.click(getByRole('button', { name: 'Background color' }))
    expect(getByRole('dialog', { name: 'content.aria.colorPicker' })).not.toBeNull()

    fireEvent.mouseDown(getByRole('button', { name: 'Outside' }))
    expect(queryByRole('dialog')).toBeNull()
  })
})
