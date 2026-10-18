import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Switch } from './Switch'

const ChatToggle = ({ initiallyEnabled, disabled = false }: { initiallyEnabled: boolean; disabled?: boolean }) => {
  const [enabled, setEnabled] = useState(initiallyEnabled)
  return (
    <>
      <label htmlFor='chat-toggle'>Show chat</label>
      <Switch checked={enabled} id='chat-toggle' disabled={disabled} onChange={setEnabled} />
      <p role='status'>{enabled ? 'Chat enabled' : 'Chat disabled'}</p>
    </>
  )
}

describe('Switch', () => {
  it.each([false, true])(
    'updates its checked state and accessible value with pointer and keyboard (initially %s)',
    async initiallyEnabled => {
      const user = userEvent.setup()
      const view = render(<ChatToggle initiallyEnabled={initiallyEnabled} />)
      const toggle = view.getByRole('switch', { name: 'Show chat' })
      expect(toggle).toHaveAttribute('aria-checked', String(initiallyEnabled))

      await user.click(view.getByText('Show chat'))
      expect(toggle).toHaveProperty('checked', !initiallyEnabled)
      expect(toggle).toHaveAttribute('aria-checked', String(!initiallyEnabled))
      expect(view.getByRole('status')).toHaveTextContent(initiallyEnabled ? 'Chat disabled' : 'Chat enabled')

      expect(toggle).toHaveFocus()
      await user.keyboard(' ')
      expect(toggle).toHaveProperty('checked', initiallyEnabled)
      expect(toggle).toHaveAttribute('aria-checked', String(initiallyEnabled))
      expect(view.getByRole('status')).toHaveTextContent(initiallyEnabled ? 'Chat enabled' : 'Chat disabled')
    },
  )

  it('keeps a disabled switch unchanged and out of the keyboard tab order', async () => {
    const user = userEvent.setup()
    const view = render(
      <>
        <ChatToggle initiallyEnabled disabled />
        <button type='button'>Next action</button>
      </>,
    )
    const toggle = view.getByRole('switch', { name: 'Show chat' })

    await user.click(view.getByText('Show chat'))
    expect(toggle).toBeDisabled()
    expect(toggle).toBeChecked()
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(view.getByRole('status')).toHaveTextContent('Chat enabled')

    await user.tab()
    expect(view.getByRole('button', { name: 'Next action' })).toHaveFocus()
  })
})
