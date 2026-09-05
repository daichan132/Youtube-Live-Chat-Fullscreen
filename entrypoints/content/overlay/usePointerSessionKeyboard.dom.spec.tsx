import { fireEvent, render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Modal } from '@/shared/components/Modal'
import { usePointerSession } from './usePointerSession'

it('cancels an overlay pointer gesture before Escape can close its modal', () => {
  const cancel = vi.fn()
  const commit = vi.fn()
  const onEnd = vi.fn()
  const onClose = vi.fn()
  const Harness = () => {
    const pointer = usePointerSession({ begin: () => ({}), move: () => {}, commit, cancel, onEnd })
    return (
      <Modal isOpen ariaLabel='Actions' shouldFocusAfterRender={false} onRequestClose={onClose}>
        <button type='button' onPointerDown={pointer.onPointerDown}>
          Drag
        </button>
      </Modal>
    )
  }
  const view = render(<Harness />)
  const handle = view.getByRole('button', { name: 'Drag' })
  fireEvent.pointerDown(handle, { button: 0, pointerId: 1 })
  fireEvent.keyDown(handle, { key: 'Escape', isComposing: true })
  expect(cancel).not.toHaveBeenCalled()
  fireEvent.keyDown(handle, { key: 'Escape' })
  fireEvent.pointerUp(window, { pointerId: 1 })

  expect(cancel).toHaveBeenCalledOnce()
  expect(onEnd).toHaveBeenCalledOnce()
  expect(commit).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
  fireEvent.keyDown(handle, { key: 'Escape' })
  expect(onClose).toHaveBeenCalledOnce()
})
