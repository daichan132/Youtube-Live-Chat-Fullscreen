import { useAtomValue } from 'jotai'
import { useState } from 'react'
import type { SanitizedDiagnosticReport } from '@/entrypoints/content/diagnostics/sanitizeDiagnosticReport'
import { TbDownload, TbReset } from '@/shared/components/icons'
import { localeCodeAtom } from '@/shared/state'

type RuntimeDiagnosticsPanelProps = {
  report: SanitizedDiagnosticReport | null
  onRestart: () => void
}

const messages = {
  en: {
    legend: 'Compatibility',
    healthy: 'Healthy',
    degraded: 'Using a compatibility fallback',
    failed: 'Compatibility issue detected',
    waiting: 'Collecting runtime diagnostics',
    lastRecovery: 'Last self-recovery',
    restart: 'Restart runtime',
    copy: 'Copy diagnostic report',
    copied: 'Diagnostic report copied',
    copyFailed: 'Could not copy the diagnostic report',
  },
  ja: {
    legend: '互換性',
    healthy: '正常',
    degraded: '互換フォールバックで動作中',
    failed: '互換性の問題を検出',
    waiting: 'Runtime 診断を取得中',
    lastRecovery: '前回の自己回復',
    restart: 'Runtimeを再起動',
    copy: '診断レポートをコピー',
    copied: '診断レポートをコピーしました',
    copyFailed: '診断レポートをコピーできませんでした',
  },
} as const

export const RuntimeDiagnosticsPanel = ({ report, onRestart }: RuntimeDiagnosticsPanelProps) => {
  const locale = useAtomValue(localeCodeAtom)
  const text = locale === 'ja' ? messages.ja : messages.en
  const [announcement, setAnnouncement] = useState('')
  const assessment = report?.compatibility.state
  const statusText = !report
    ? text.waiting
    : assessment === 'passed'
      ? text.healthy
      : assessment === 'degraded'
        ? text.degraded
        : text.failed
  const lastRecovery = report?.events.findLast(event => event.event === 'recovered')
  const detail = report
    ? [report.browserFamily, report.page.mode, report.runtime.status, report.runtime.leases.chat.kind]
        .filter(value => value !== 'none')
        .join(' · ')
    : ''

  const copyReport = async () => {
    if (!report) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2))
      setAnnouncement(text.copied)
    } catch {
      setAnnouncement(text.copyFailed)
    }
  }

  return (
    <fieldset className='ylc-setting-group' data-ylc-runtime-diagnostics>
      <legend className='ylc-setting-group-legend'>{text.legend}</legend>
      <div className='mx-3 rounded-lg border border-solid ylc-theme-border ylc-theme-surface p-3'>
        <div className='flex items-start gap-2'>
          <span
            aria-hidden='true'
            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
              assessment === 'failed' ? 'bg-red-500' : assessment === 'degraded' ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
          <div className='min-w-0'>
            <p className='m-0 text-sm font-semibold ylc-theme-text-primary'>{statusText}</p>
            {detail && <p className='mt-1 mb-0 text-xs ylc-theme-text-secondary'>{detail}</p>}
            {report?.runtime.failureCode && (
              <p className='mt-1 mb-0 text-xs font-mono ylc-theme-text-secondary'>{report.runtime.failureCode}</p>
            )}
          </div>
        </div>
        {lastRecovery && (
          <p className='mt-3 mb-0 text-xs ylc-theme-text-secondary'>
            {text.lastRecovery}: {Math.round(lastRecovery.elapsedMs / 100) / 10}s
          </p>
        )}
        <div className='mt-3 flex flex-wrap gap-2'>
          <button
            type='button'
            className='inline-flex items-center gap-1.5 rounded-md border border-solid ylc-theme-border ylc-theme-surface px-2.5 py-2 text-xs ylc-theme-text-primary cursor-pointer hover:bg-[var(--ylc-hover-surface)] ylc-theme-focus-ring disabled:opacity-40 disabled:cursor-not-allowed'
            onClick={onRestart}
          >
            <TbReset size={16} />
            {text.restart}
          </button>
          <button
            type='button'
            className='inline-flex items-center gap-1.5 rounded-md border border-solid ylc-theme-border ylc-theme-surface px-2.5 py-2 text-xs ylc-theme-text-primary cursor-pointer hover:bg-[var(--ylc-hover-surface)] ylc-theme-focus-ring disabled:opacity-40 disabled:cursor-not-allowed'
            disabled={!report}
            onClick={copyReport}
          >
            <TbDownload size={16} />
            {text.copy}
          </button>
        </div>
        <span className='ylc-visually-hidden' role='status' aria-live='polite'>
          {announcement}
        </span>
      </div>
    </fieldset>
  )
}
