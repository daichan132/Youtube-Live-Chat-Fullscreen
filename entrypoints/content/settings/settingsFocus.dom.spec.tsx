import { fireEvent, render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { SettingsFrame } from './SettingsFrame'
import { SETTINGS_FRAME_MESSAGE } from './settingsFrameMessages'

it.each([false, true])('restores a replacement trigger unless the user has moved focus: %s', movedFocus => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = host.attachShadow({ mode: 'open' })
  const source = document.createElement('button')
  root.append(source)
  const runtime = { getDiagnosticReport: vi.fn(() => ({ schemaVersion: 1 }) as never), restart: vi.fn(), subscribe: () => () => {} }
  const onClose = vi.fn()
  const view = render(<SettingsFrame open returnFocusTo={source} onClose={onClose} runtime={runtime} />, {
    container: document.body.appendChild(document.createElement('div')),
  })
  const replacement = document.createElement('button')
  replacement.dataset.ylcSettingsBtn = ''
  source.replaceWith(replacement)
  if (movedFocus) replacement.focus()
  const other = document.createElement('button')
  root.append(other)
  if (movedFocus) other.focus()
  const frame = view.container.querySelector('iframe') as HTMLIFrameElement
  const url = new URL(browser.runtime.getURL('/'))
  fireEvent(
    window,
    new MessageEvent('message', {
      source: frame.contentWindow,
      origin: `${url.protocol}//${url.host}`,
      data: { type: SETTINGS_FRAME_MESSAGE.close },
    }),
  )
  view.rerender(<SettingsFrame open={false} returnFocusTo={source} onClose={onClose} runtime={runtime} />)
  expect(root.activeElement).toBe(movedFocus ? other : replacement)
  view.unmount()
  host.remove()
})
