import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Slider } from './Slider'

describe('Slider', () => {
  it('positions handle based on value', () => {
    const { container } = render(<Slider value={0.25} />)
    const handle = container.querySelector('.ylc-slider-thumb') as HTMLElement

    expect(handle).not.toBeNull()
    expect(handle.style.left).toBe('25%')
  })
})
