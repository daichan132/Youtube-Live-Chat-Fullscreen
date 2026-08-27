import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsFrame } from './SettingsFrame'
import { SETTINGS_FRAME_MESSAGE } from './settingsFrameMessages'

const createRuntime = () => ({
  getDiagnosticReport: vi.fn(() => ({ schemaVersion: 1 }) as never),
  restart: vi.fn(),
  subscribe: vi.fn(() => vi.fn()),
})

describe('SettingsFrame', () => {
  it('does not mount the extension page while settings are closed', () => {
    const { queryByTitle } = render(<SettingsFrame open={false} onClose={vi.fn()} runtime={createRuntime()} />)

    expect(queryByTitle('content.aria.settingsFrameTitle')).not.toBeInTheDocument()
  })

  it('loads the settings extension page only while open', () => {
    const { getByTitle } = render(<SettingsFrame open onClose={vi.fn()} runtime={createRuntime()} />)

    expect(getByTitle('content.aria.settingsFrameTitle')).toHaveAttribute('src', expect.stringMatching(/settings\.html$/))
  })

  it('accepts close messages only from its own extension frame', () => {
    const onClose = vi.fn()
    const runtime = createRuntime()
    const { getByTitle } = render(<SettingsFrame open onClose={onClose} runtime={runtime} />)
    const frame = getByTitle('content.aria.settingsFrameTitle') as HTMLIFrameElement

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
        data: { type: 'unrelated-message' },
      }),
    )
    expect(onClose).not.toHaveBeenCalled()

    fireEvent(
      window,
      new MessageEvent('message', {
        source: frame.contentWindow,
        data: { type: SETTINGS_FRAME_MESSAGE.close },
      }),
    )
    expect(onClose).toHaveBeenCalledOnce()

    fireEvent(
      window,
      new MessageEvent('message', {
        source: frame.contentWindow,
        data: { type: SETTINGS_FRAME_MESSAGE.runtimeRestart },
      }),
    )
    expect(runtime.restart).toHaveBeenCalledOnce()
  })
})
