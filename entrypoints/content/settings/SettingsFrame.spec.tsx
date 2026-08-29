import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { SettingsFrame } from './SettingsFrame'
import { SETTINGS_FRAME_MESSAGE } from './settingsFrameMessages'

const createRuntime = () => ({
  getDiagnosticReport: vi.fn(() => ({ schemaVersion: 1 }) as never),
  restart: vi.fn(),
  subscribe: vi.fn(() => vi.fn()),
})

const extensionUrl = new URL(browser.runtime.getURL('/'))
const extensionOrigin = `${extensionUrl.protocol}//${extensionUrl.host}`

describe('SettingsFrame', () => {
  it('does not mount the extension page while settings are closed', () => {
    const { queryByTitle } = render(<SettingsFrame open={false} onClose={vi.fn()} runtime={createRuntime()} />)

    expect(queryByTitle('YouTube Live Chat Fullscreen settings')).not.toBeInTheDocument()
  })

  it('loads the settings extension page only while open', () => {
    const { getByTitle } = render(<SettingsFrame open onClose={vi.fn()} runtime={createRuntime()} />)

    expect(getByTitle('YouTube Live Chat Fullscreen settings')).toHaveAttribute('src', expect.stringMatching(/settings\.html/))
  })

  it('accepts close messages only from its own extension frame', () => {
    const onClose = vi.fn()
    const runtime = createRuntime()
    const { getByTitle } = render(<SettingsFrame open onClose={onClose} runtime={runtime} />)
    const frame = getByTitle('YouTube Live Chat Fullscreen settings') as HTMLIFrameElement

    fireEvent(
      window,
      new MessageEvent('message', {
        source: window,
        data: { type: SETTINGS_FRAME_MESSAGE.close },
      }),
    )
    fireEvent(
      window,
      new MessageEvent('message', {
        source: frame.contentWindow,
        origin: extensionOrigin,
        data: { type: 'unrelated-message' },
      }),
    )
    fireEvent(
      window,
      new MessageEvent('message', {
        source: frame.contentWindow,
        origin: 'https://www.youtube.com',
        data: { type: SETTINGS_FRAME_MESSAGE.close },
      }),
    )
    expect(onClose).not.toHaveBeenCalled()

    fireEvent(
      window,
      new MessageEvent('message', {
        source: frame.contentWindow,
        origin: extensionOrigin,
        data: { type: SETTINGS_FRAME_MESSAGE.close },
      }),
    )
    expect(onClose).toHaveBeenCalledOnce()

    fireEvent(
      window,
      new MessageEvent('message', {
        source: frame.contentWindow,
        origin: extensionOrigin,
        data: { type: SETTINGS_FRAME_MESSAGE.runtimeRestart },
      }),
    )
    expect(runtime.restart).toHaveBeenCalledOnce()
  })
})
