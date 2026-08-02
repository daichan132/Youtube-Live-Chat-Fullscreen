import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsFrame } from './SettingsFrame'
import { SETTINGS_FRAME_MESSAGE } from './settingsFrameMessages'

describe('SettingsFrame', () => {
  it('does not mount the extension page while settings are closed', () => {
    const { queryByTitle } = render(<SettingsFrame open={false} onClose={vi.fn()} />)

    expect(queryByTitle('YouTube Live Chat Fullscreen settings')).not.toBeInTheDocument()
  })

  it('loads the settings extension page only while open', () => {
    const { getByTitle } = render(<SettingsFrame open onClose={vi.fn()} />)

    expect(getByTitle('YouTube Live Chat Fullscreen settings')).toHaveAttribute('src', expect.stringMatching(/settings\.html$/))
  })

  it('accepts close messages only from its own extension frame', () => {
    const onClose = vi.fn()
    const { getByTitle } = render(<SettingsFrame open onClose={onClose} />)
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
  })
})
