import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingColorPicker } from './SettingColorPicker'

describe('SettingColorPicker', () => {
  it('describes the current color from an internal id', () => {
    const { getByRole, getByText } = render(
      <SettingColorPicker rgba={{ r: 1, g: 2, b: 3, a: 0.4 }} label='Background color' onChange={vi.fn()} />,
    )

    const description = getByText('Current color: rgba(1, 2, 3, 0.4)')
    expect(getByRole('button', { name: 'Background color' }).getAttribute('aria-describedby')).toBe(description.id)
  })

  it('renders the color picker dialog only while open', () => {
    const { getByRole, queryByRole } = render(
      <SettingColorPicker rgba={{ r: 1, g: 2, b: 3, a: 0.4 }} label='Background color' onChange={vi.fn()} />,
    )

    expect(queryByRole('dialog')).toBeNull()

    fireEvent.click(getByRole('button', { name: 'Background color' }))
    expect(getByRole('dialog', { name: 'content.aria.colorPicker' })).toHaveClass('ylc-theme-popover')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(queryByRole('dialog')).toBeNull()
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

  it('reports the end of a drag released outside the picker', () => {
    const onChange = vi.fn()
    const onInteractionEnd = vi.fn()
    const { getAllByRole, getByRole } = render(
      <SettingColorPicker
        rgba={{ r: 1, g: 2, b: 3, a: 0.4 }}
        label='Background color'
        onChange={onChange}
        onInteractionEnd={onInteractionEnd}
      />,
    )

    fireEvent.click(getByRole('button', { name: 'Background color' }))
    const slider = getAllByRole('slider')[0]
    if (!slider) throw new Error('Missing color slider.')
    slider.getBoundingClientRect = () =>
      ({
        bottom: 100,
        height: 100,
        left: 0,
        right: 200,
        top: 0,
        width: 200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect

    fireEvent.mouseDown(slider, { buttons: 1, pageX: 100, pageY: 50 })
    fireEvent.mouseMove(window, { buttons: 1, pageX: 150, pageY: 25 })
    fireEvent.mouseUp(window)

    expect(onChange).toHaveBeenCalled()
    expect(onInteractionEnd).toHaveBeenCalled()
  })
})
