import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Switch } from './Switch'

describe('Switch', () => {
  it('calls onChange with toggled value when clicked (unchecked)', () => {
    const onChange = vi.fn()
    const { getByRole } = render(<Switch checked={false} id='switch' onChange={onChange} />)

    fireEvent.click(getByRole('checkbox'))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('calls onChange with toggled value when clicked (checked)', () => {
    const onChange = vi.fn()
    const { getByRole } = render(<Switch checked id='switch' onChange={onChange} />)

    fireEvent.click(getByRole('checkbox'))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(false)
  })
})
