import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SanitizedDiagnosticReport } from '@/entrypoints/content/diagnostics/sanitizeDiagnosticReport'
import type { LocaleMessages } from '@/shared/i18n/generated/translationTypes'
import { localeStateAtom, localeStateFromMessages } from '@/shared/state/atoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { RuntimeDiagnosticsPanel } from './RuntimeDiagnosticsPanel'

const flattenMessages = (source: Record<string, unknown>, prefix = '', output: Record<string, string> = {}) => {
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) flattenMessages(value as Record<string, unknown>, path, output)
    else output[path] = String(value)
  }
  return output
}

const japaneseMessages = flattenMessages(
  JSON.parse(readFileSync(resolve(process.cwd(), 'shared/i18n/assets/ja.json'), 'utf8')),
) as LocaleMessages

const createJapaneseStore = () => {
  const store = createTestStore()
  store.set(localeStateAtom, localeStateFromMessages('ja', japaneseMessages))
  return store
}

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
  it('renders Japanese status and exposes the reload control without changing settings', () => {
    const store = createJapaneseStore()
    const onRestart = vi.fn()
    const { getByRole, getByText } = renderWithStore(<RuntimeDiagnosticsPanel report={report} onRestart={onRestart} />, store)

    expect(getByText('互換性')).toBeInTheDocument()
    expect(getByText('正常')).toBeInTheDocument()
    fireEvent.click(getByRole('button', { name: 'チャットを再読み込み' }))
    expect(onRestart).toHaveBeenCalledOnce()
  })

  it('keeps internal runtime identifiers out of the rendered panel', () => {
    const store = createJapaneseStore()
    const failing: SanitizedDiagnosticReport = {
      ...report,
      runtime: { ...report.runtime, status: 'unavailable', failureCode: 'IFRAME_DOCUMENT_NOT_READY' },
      compatibility: { ...report.compatibility, state: 'failed' },
    }
    const { container } = renderWithStore(<RuntimeDiagnosticsPanel report={failing} onRestart={vi.fn()} />, store)

    const rendered = container.textContent ?? ''
    for (const identifier of ['opera', 'live', 'active', 'borrowed-live', 'IFRAME_DOCUMENT_NOT_READY']) {
      expect(rendered, `internal identifier leaked: ${identifier}`).not.toContain(identifier)
    }
    expect(rendered).toContain('互換性の問題を検出')
  })

  it('copies only the sanitized report', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const store = createJapaneseStore()
    const { getByRole, getByText } = renderWithStore(<RuntimeDiagnosticsPanel report={report} onRestart={vi.fn()} />, store)

    fireEvent.click(getByRole('button', { name: '診断レポートをコピー' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(JSON.stringify(report, null, 2)))
    await waitFor(() => expect(getByText('診断レポートをコピーしました')).toBeInTheDocument())
  })
})
