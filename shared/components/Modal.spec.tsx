import { render } from '@testing-library/react'
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
})
