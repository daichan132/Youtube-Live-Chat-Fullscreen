import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { Modal } from './Modal'

describe('Modal', () => {
  it('uses the shared modal layer and an accessible name by default', () => {
    const { getByRole } = render(
      <Modal isOpen ariaLabel='Test dialog'>
        <div>content</div>
      </Modal>,
    )

    expect(getByRole('dialog', { name: 'Test dialog' })).toHaveStyle({ zIndex: String(CONTENT_UI_LAYER.modal) })
  })

  it('closes with Escape and restores focus to the invoking control', async () => {
    const user = userEvent.setup()
    const Harness = () => {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type='button' onClick={() => setOpen(true)}>
            Open dialog
          </button>
          <Modal isOpen={open} ariaLabel='Actions' onRequestClose={() => setOpen(false)}>
            <button type='button'>Dialog action</button>
          </Modal>
        </>
      )
    }
    const { getByRole, queryByRole } = render(<Harness />)
    const trigger = getByRole('button', { name: 'Open dialog' })

    await user.click(trigger)
    const dialog = getByRole('dialog', { name: 'Actions' })
    expect(dialog).toBeVisible()
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))
    await user.keyboard('{Escape}')

    expect(queryByRole('dialog')).toBeNull()
    expect(trigger).toHaveFocus()
  })

  it('keeps forward and reverse tab navigation inside the dialog', async () => {
    const user = userEvent.setup()
    const { getByRole } = render(
      <Modal isOpen ariaLabel='Actions'>
        <button type='button'>First action</button>
        <button type='button'>Last action</button>
      </Modal>,
    )
    const first = getByRole('button', { name: 'First action' })
    const last = getByRole('button', { name: 'Last action' })

    await user.tab()
    expect(first).toHaveFocus()
    await user.tab()
    expect(last).toHaveFocus()
    await user.tab()
    expect(first).toHaveFocus()
    await user.tab({ shift: true })
    expect(last).toHaveFocus()
  })

  it('makes background content inert while open and restores it after close', () => {
    const background = document.createElement('main')
    document.body.appendChild(background)
    const { unmount } = render(
      <Modal isOpen ariaLabel='Actions'>
        <button type='button'>Action</button>
      </Modal>,
    )

    expect(background).toHaveAttribute('inert')
    unmount()
    expect(background).not.toHaveAttribute('inert')
    background.remove()
  })
})
