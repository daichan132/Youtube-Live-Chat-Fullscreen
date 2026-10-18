import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useShadowClickAway } from './useShadowClickAway'

const Menu = ({ revision = 'current' }: { revision?: string }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [dismissedBy, setDismissedBy] = useState<string | null>(null)
  useShadowClickAway(ref, () => setDismissedBy(revision))
  return dismissedBy ? (
    <p role='status'>Closed by {dismissedBy}</p>
  ) : (
    <div role='dialog' aria-label='Actions' ref={ref}>
      <button type='button'>Inside action</button>
    </div>
  )
}

describe('useShadowClickAway', () => {
  it('keeps a menu open for clicks inside its shadow root and closes it for an outside click', async () => {
    const user = userEvent.setup()
    const host = document.createElement('div')
    const outside = document.createElement('button')
    outside.textContent = 'Outside action'
    document.body.append(host, outside)
    const shadow = host.attachShadow({ mode: 'open' })
    const view = render(<Menu />, { container: shadow })

    try {
      // Native composed events are retargeted to the host at document level.
      // A fabricated composedPath would not catch a switch to event.target.
      await user.click(view.getByRole('button', { name: 'Inside action' }))
      expect(view.getByRole('dialog', { name: 'Actions' })).toBeVisible()
      expect(view.queryByRole('status')).toBeNull()

      await user.click(outside)
      expect(view.queryByRole('dialog')).toBeNull()
      expect(view.getByRole('status')).toHaveTextContent('Closed by current')
    } finally {
      view.unmount()
      host.remove()
      outside.remove()
    }
  })

  it('uses the current dismissal behavior after the owner rerenders', async () => {
    const user = userEvent.setup()
    const view = render(<Menu revision='previous' />)
    view.rerender(<Menu revision='latest' />)

    await user.click(document.body)

    expect(view.queryByRole('dialog')).toBeNull()
    expect(view.getByRole('status')).toHaveTextContent('Closed by latest')
  })
})
