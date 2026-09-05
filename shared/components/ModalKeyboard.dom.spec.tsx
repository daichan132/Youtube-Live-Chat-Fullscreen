import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Modal keyboard ownership', () => {
  it('lets a child consume Escape and closes once for an unhandled Escape', () => {
    const onRequestClose = vi.fn()
    const view = render(
      <Modal isOpen ariaLabel='Settings' shouldFocusAfterRender={false} onRequestClose={onRequestClose}>
        <input aria-label='Editor' onKeyDown={event => event.preventDefault()} />
        <button type='button'>Close with Escape</button>
      </Modal>,
    )

    fireEvent.keyDown(view.getByRole('textbox'), { key: 'Escape' })
    expect(onRequestClose).not.toHaveBeenCalled()
    fireEvent.keyDown(view.getByRole('button'), { key: 'Escape', isComposing: true })
    expect(onRequestClose).not.toHaveBeenCalled()
    fireEvent.keyDown(view.getByRole('button'), { key: 'Escape' })
    expect(onRequestClose).toHaveBeenCalledOnce()
  })

  it('still handles Escape before deferred focus enters the dialog', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    const onRequestClose = vi.fn()
    const view = render(
      <Modal isOpen ariaLabel='Settings' onRequestClose={onRequestClose}>
        <button type='button'>Action</button>
      </Modal>,
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onRequestClose).toHaveBeenCalledOnce()
    view.unmount()
    expect(cancelFrame).toHaveBeenCalledWith(1)
  })

  it('wraps Tab using only enabled, visible controls in the tab order', () => {
    const view = render(
      <Modal isOpen ariaLabel='Settings' shouldFocusAfterRender={false}>
        <button type='button' tabIndex={-1}>
          Inactive tab
        </button>
        <button type='button'>First</button>
        <button type='button'>Last</button>
        <div hidden>
          <button type='button'>Hidden ancestor</button>
        </div>
        <div inert>
          <button type='button'>Inert ancestor</button>
        </div>
        <fieldset disabled>
          <button type='button'>Disabled ancestor</button>
        </fieldset>
        <div style={{ display: 'none' }}>
          <button type='button'>CSS hidden</button>
        </div>
        <button type='button' style={{ visibility: 'hidden' }}>
          Invisible
        </button>
        <button type='button' tabIndex={-2}>
          Programmatic only
        </button>
      </Modal>,
    )
    const first = view.getByRole('button', { name: 'First' })
    const last = view.getByRole('button', { name: 'Last' })

    first.focus()
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(first).toHaveFocus()
  })

  it('does not override Tab handled by an inner composite control', () => {
    const view = render(
      <Modal isOpen ariaLabel='Settings' shouldFocusAfterRender={false}>
        <button type='button' onKeyDown={event => event.preventDefault()}>
          Composite
        </button>
        <button type='button'>Last</button>
      </Modal>,
    )
    const composite = view.getByRole('button', { name: 'Composite' })
    composite.focus()
    fireEvent.keyDown(composite, { key: 'Tab', shiftKey: true })
    expect(composite).toHaveFocus()
  })

  it('closes only the nested dialog and restores its parent interaction', () => {
    const onOuterClose = vi.fn()
    const Harness = () => {
      const [nested, setNested] = useState(false)
      return (
        <Modal isOpen ariaLabel='Outer' shouldFocusAfterRender={false} onRequestClose={onOuterClose}>
          <button type='button' onClick={() => setNested(true)}>
            Open nested
          </button>
          {nested && (
            <Modal isOpen ariaLabel='Inner' shouldFocusAfterRender={false} onRequestClose={() => setNested(false)}>
              <button type='button'>Nested action</button>
            </Modal>
          )}
        </Modal>
      )
    }
    const view = render(<Harness />)
    const trigger = view.getByRole('button', { name: 'Open nested' })
    trigger.focus()
    fireEvent.click(trigger)
    fireEvent.keyDown(view.getByRole('button', { name: 'Nested action' }), { key: 'Escape' })

    expect(view.queryByRole('dialog', { name: 'Inner' })).toBeNull()
    expect(view.getByRole('dialog', { name: 'Outer' })).not.toHaveAttribute('inert')
    expect(trigger).toHaveFocus()
    expect(onOuterClose).not.toHaveBeenCalled()
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(onOuterClose).toHaveBeenCalledOnce()
  })
})
