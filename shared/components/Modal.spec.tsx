import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { Modal } from './Modal'

describe('Modal', () => {
  it('uses the shared modal layer by default', () => {
    const { getByRole } = render(
      <Modal isOpen>
        <div>content</div>
      </Modal>,
    )

    expect(getByRole('dialog')).toHaveStyle({ zIndex: String(CONTENT_UI_LAYER.modal) })
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
          <Modal isOpen={open} onRequestClose={() => setOpen(false)}>
            <button type='button'>Dialog action</button>
          </Modal>
        </>
      )
    }
    const { getByRole, queryByRole } = render(<Harness />)
    const trigger = getByRole('button', { name: 'Open dialog' })

    await user.click(trigger)
    const dialog = getByRole('dialog')
    expect(dialog).toBeVisible()
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))
    await user.keyboard('{Escape}')

    expect(queryByRole('dialog')).toBeNull()
    expect(trigger).toHaveFocus()
  })
})
