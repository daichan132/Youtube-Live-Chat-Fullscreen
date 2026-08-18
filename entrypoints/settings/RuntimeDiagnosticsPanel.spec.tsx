import { fireEvent, render, waitFor } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { describe, expect, it, vi } from 'vitest'
import type { SanitizedDiagnosticReport } from '@/entrypoints/content/diagnostics/sanitizeDiagnosticReport'
import { localeStateAtom, localeStateFromMessages } from '@/shared/state/atoms'
import { renderWithStore } from '@/shared/state/testUtils'
import { RuntimeDiagnosticsPanel } from './RuntimeDiagnosticsPanel'

const report: SanitizedDiagnosticReport = {
  schemaVersion: 1,
  extensionVersion: '2.3.14',
  browserFamily: 'opera',
  page: {
    mode: 'live',
    fullscreen: true,
    capabilities: {
      canBorrowNativeChat: true,
      canCreateManagedLiveChat: true,
      canOpenArchiveChat: false,
      canRestoreNativeChat: true,
      canMountOverlay: true,
      canMountPlayerSwitch: true,
    },
    probeIds: ['player.v1.1'],
  },
  runtime: {
    generation: 1,
    status: 'active',
    leases: {
      chat: { kind: 'borrowed-live', state: 'attached' },
      presentation: 'overlay-and-switch',
      layout: 'floating',
      restoringChatCount: 0,
    },
  },
  compatibility: {
    fingerprint: {
      playerProbe: 'player.v1.1',
      controlsProbe: 'controls.right.v1.1',
      chatProbe: 'chat.iframe.v2.1',
      archiveControlProbe: null,
      mode: 'live',
      source: 'borrowed-live',
      capabilities: { overlay: true, playerSwitch: true, nativeRestore: true },
    },
    state: 'passed',
    reasons: [],
  },
  events: [],
}

describe('RuntimeDiagnosticsPanel', () => {
  it('renders Japanese status and exposes restart without changing settings', () => {
    const store = createStore()
    store.set(localeStateAtom, localeStateFromMessages('ja', {} as never))
    const onRestart = vi.fn()
    const { getByRole, getByText } = renderWithStore(<RuntimeDiagnosticsPanel report={report} onRestart={onRestart} />, store)

    expect(getByText('正常')).toBeInTheDocument()
    expect(getByText('opera · live · active · borrowed-live')).toBeInTheDocument()
    fireEvent.click(getByRole('button', { name: 'Runtimeを再起動' }))
    expect(onRestart).toHaveBeenCalledOnce()
  })

  it('copies only the sanitized report', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const { getByRole } = render(<RuntimeDiagnosticsPanel report={report} onRestart={vi.fn()} />)

    fireEvent.click(getByRole('button', { name: 'Copy diagnostic report' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(JSON.stringify(report, null, 2)))
  })
})
