import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlacementActionButton } from './PlacementActionButton'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())
const press = (button: HTMLElement, pointerId = 1) => fireEvent.pointerDown(button, { button: 0, isPrimary: true, pointerId })
const release = (button: HTMLElement, pointerId = 1) => {
  fireEvent.pointerUp(button, { pointerId })
  fireEvent.click(button, { detail: 1 })
}
const setup = () => {
  const adjust = vi.fn()
  const view = render(<PlacementActionButton onAdjust={adjust}>Move</PlacementActionButton>)
  return { ...view, adjust, button: screen.getByRole('button', { name: 'Move' }) }
}

describe('placement button press and hold', () => {
  it('keeps a short pointer click to one adjustment', () => {
    const { button, adjust } = setup()
    press(button)
    act(() => vi.advanceTimersByTime(200))
    expect(adjust).not.toHaveBeenCalled()
    release(button)
    expect(adjust).toHaveBeenCalledOnce()
    act(() => vi.advanceTimersByTime(1000))
    expect(adjust).toHaveBeenCalledOnce()
  })

  it('repeats after the hold delay, uses the latest action, and adds no release click', () => {
    const { button, adjust, rerender } = setup()
    press(button)
    act(() => vi.advanceTimersByTime(349))
    expect(adjust).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(adjust).toHaveBeenCalledOnce()
    const next = vi.fn()
    rerender(<PlacementActionButton onAdjust={next}>Move</PlacementActionButton>)
    act(() => vi.advanceTimersByTime(160))
    expect(next).toHaveBeenCalledTimes(2)
    release(button)
    act(() => vi.advanceTimersByTime(1000))
    expect(next).toHaveBeenCalledTimes(2)
    fireEvent.click(button, { detail: 0 })
    expect(next).toHaveBeenCalledTimes(3)
    press(button)
    release(button)
    expect(next).toHaveBeenCalledTimes(4)
  })

  it.each(['leave', 'cancel', 'blur', 'window blur', 'visibility', 'unmount'])('stops held input on %s', exit => {
    const { button, adjust, unmount } = setup()
    press(button)
    act(() => vi.advanceTimersByTime(430))
    expect(adjust).toHaveBeenCalledTimes(2)
    if (exit === 'leave') fireEvent.pointerLeave(button)
    if (exit === 'cancel') fireEvent.pointerCancel(document, { pointerId: 1 })
    if (exit === 'blur') fireEvent.blur(button)
    if (exit === 'window blur') fireEvent(window, new Event('blur'))
    if (exit === 'visibility') fireEvent(document, new Event('visibilitychange'))
    if (exit === 'unmount') unmount()
    act(() => vi.advanceTimersByTime(1000))
    expect(adjust).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ignores secondary pointers and ends only for the owning pointer', () => {
    const { button, adjust } = setup()
    fireEvent.pointerDown(button, { button: 2, isPrimary: true, pointerId: 2 })
    fireEvent.pointerDown(button, { button: 0, isPrimary: false, pointerId: 2 })
    act(() => vi.advanceTimersByTime(500))
    expect(adjust).not.toHaveBeenCalled()
    press(button)
    fireEvent.pointerUp(document, { pointerId: 2 })
    act(() => vi.advanceTimersByTime(350))
    expect(adjust).toHaveBeenCalledOnce()
    fireEvent.pointerUp(document, { pointerId: 1 })
    act(() => vi.advanceTimersByTime(500))
    expect(adjust).toHaveBeenCalledOnce()
  })

  it.each(['Enter', ' '])('supports held %j and ignores platform repeat frequency', key => {
    const { button, adjust } = setup()
    fireEvent.keyDown(button, { key })
    expect(adjust).toHaveBeenCalledOnce()
    fireEvent.keyDown(button, { key, repeat: true })
    expect(adjust).toHaveBeenCalledOnce()
    act(() => vi.advanceTimersByTime(430))
    expect(adjust).toHaveBeenCalledTimes(3)
    fireEvent.keyUp(button, { key })
    act(() => vi.advanceTimersByTime(500))
    expect(adjust).toHaveBeenCalledTimes(3)
  })

  it('cancels pending work before an action unmounts the control', () => {
    const { button, adjust, unmount } = setup()
    adjust.mockImplementation(unmount)
    press(button)
    act(() => vi.advanceTimersByTime(1000))
    expect(adjust).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('stops a hold immediately when the button reaches its disabled limit', () => {
    const { button, adjust, rerender } = setup()
    press(button)
    act(() => vi.advanceTimersByTime(350))
    expect(adjust).toHaveBeenCalledOnce()
    rerender(
      <PlacementActionButton disabled onAdjust={adjust}>
        Move
      </PlacementActionButton>,
    )
    act(() => vi.advanceTimersByTime(1000))
    expect(adjust).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    rerender(<PlacementActionButton onAdjust={adjust}>Move</PlacementActionButton>)
    press(button)
    release(button)
    expect(adjust).toHaveBeenCalledTimes(2)
  })
})
