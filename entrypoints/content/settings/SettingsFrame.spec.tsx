import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { createSanitizedDiagnosticReport } from '../diagnostics/sanitizeDiagnosticReport'
import { SettingsFrame } from './SettingsFrame'
import { SETTINGS_FRAME_MESSAGE } from './settingsFrameMessages'

const diagnosticReport = createSanitizedDiagnosticReport({
  extensionVersion: 'frame-test',
  browserFamily: 'firefox',
  generation: 7,
  evidence: null,
  state: { status: 'inactive', reason: 'not-fullscreen' },
  leases: { chat: { kind: 'none', state: 'none' }, presentation: 'none', layout: 'none', restoringChatCount: 0 },
  events: [],
})

const createRuntime = () => ({
  getDiagnosticReport: vi.fn(() => diagnosticReport),
  restart: vi.fn(),
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
    const expected = new URL(browser.runtime.getURL('/settings.html'))
    expected.searchParams.set('parentOrigin', 'https://www.youtube.com')

    expect(getByTitle('YouTube Live Chat Fullscreen settings')).toHaveAttribute('src', expected.href)
  })

  it('accepts frame commands and sends diagnostics only through its trusted extension frame', () => {
    const onClose = vi.fn()
    const runtime = createRuntime()
    const { getByTitle } = render(<SettingsFrame open onClose={onClose} runtime={runtime} />)
    const frame = getByTitle('YouTube Live Chat Fullscreen settings') as HTMLIFrameElement
    if (!frame.contentWindow) throw new Error('Missing settings frame window.')
    const postMessage = vi.spyOn(frame.contentWindow, 'postMessage').mockImplementation(() => {})
    const expectDiagnosticReply = () => {
      const [message, target] = postMessage.mock.lastCall ?? []
      expect(message).toEqual({ type: SETTINGS_FRAME_MESSAGE.diagnosticsReport, report: diagnosticReport })
      expect(typeof target === 'string' ? target : target?.targetOrigin).toBe(extensionOrigin)
    }

    fireEvent(
      window,
      new MessageEvent('message', {
        source: window,
        origin: extensionOrigin,
        data: { type: SETTINGS_FRAME_MESSAGE.diagnosticsRequest },
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
    expect(postMessage).not.toHaveBeenCalled()

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
        data: { type: SETTINGS_FRAME_MESSAGE.diagnosticsRequest },
      }),
    )
    expectDiagnosticReply()
    postMessage.mockClear()

    fireEvent(
      window,
      new MessageEvent('message', {
        source: frame.contentWindow,
        origin: extensionOrigin,
        data: { type: SETTINGS_FRAME_MESSAGE.runtimeRestart },
      }),
    )
    expect(runtime.restart).toHaveBeenCalledOnce()
    expect(postMessage).toHaveBeenCalledOnce()
    expectDiagnosticReply()
  })
})
