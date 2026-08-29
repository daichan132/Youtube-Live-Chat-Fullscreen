import { useState } from 'react'
import type { SanitizedDiagnosticReport } from '@/entrypoints/content/diagnostics/sanitizeDiagnosticReport'
import { TbDownload, TbReset } from '@/shared/components/icons'
import { useT } from '@/shared/i18n/react'

type RuntimeDiagnosticsPanelProps = {
  report: SanitizedDiagnosticReport | null
  onRestart: () => void
}

export const RuntimeDiagnosticsPanel = ({ report, onRestart }: RuntimeDiagnosticsPanelProps) => {
  const t = useT()
  const [announcement, setAnnouncement] = useState('')
  const assessment = report?.compatibility.state
  const statusText = !report
    ? t('content.diagnostics.waiting')
    : assessment === 'passed'
      ? t('content.diagnostics.healthy')
      : assessment === 'degraded'
        ? t('content.diagnostics.degraded')
        : t('content.diagnostics.failed')
  const lastRecovery = report?.events.findLast(event => event.event === 'recovered')

  const copyReport = async () => {
    if (!report) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2))
      setAnnouncement(t('content.diagnostics.copied'))
    } catch {
      setAnnouncement(t('content.diagnostics.copyFailed'))
    }
  }

  return (
    <fieldset className='ylc-setting-group' data-ylc-runtime-diagnostics>
      <legend className='ylc-setting-group-legend'>{t('content.diagnostics.legend')}</legend>
      <div className='mx-3 rounded-lg border border-solid ylc-theme-border ylc-theme-surface p-3'>
        <div className='flex items-start gap-2'>
          <span
            aria-hidden='true'
            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
              assessment === 'failed' ? 'bg-red-500' : assessment === 'degraded' ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
          <div className='min-w-0'>
            {/* Internal identifiers (browser family, page mode, runtime status, lease kind, failure code) are
                never rendered: they are English-only union members. They travel in the copied JSON report instead. */}
            <p className='m-0 text-sm font-semibold ylc-theme-text-primary'>{statusText}</p>
          </div>
        </div>
        {lastRecovery && (
          <p className='mt-3 mb-0 text-xs ylc-theme-text-secondary'>
            {t('content.diagnostics.lastRecovery')}: {Math.round(lastRecovery.elapsedMs / 100) / 10}s
          </p>
        )}
        <div className='mt-3 flex flex-wrap gap-2'>
          <button
            type='button'
            className='inline-flex items-center gap-1.5 rounded-md border border-solid ylc-theme-border ylc-theme-surface px-2.5 py-2 text-xs ylc-theme-text-primary cursor-pointer hover:bg-[var(--ylc-hover-surface)] ylc-theme-focus-ring disabled:opacity-40 disabled:cursor-not-allowed'
            onClick={onRestart}
          >
            <TbReset size={16} />
            {t('content.diagnostics.restart')}
          </button>
          <button
            type='button'
            className='inline-flex items-center gap-1.5 rounded-md border border-solid ylc-theme-border ylc-theme-surface px-2.5 py-2 text-xs ylc-theme-text-primary cursor-pointer hover:bg-[var(--ylc-hover-surface)] ylc-theme-focus-ring disabled:opacity-40 disabled:cursor-not-allowed'
            disabled={!report}
            onClick={copyReport}
          >
            <TbDownload size={16} />
            {t('content.diagnostics.copy')}
          </button>
        </div>
        <span className='ylc-visually-hidden' role='status' aria-live='polite'>
          {announcement}
        </span>
      </div>
    </fieldset>
  )
}
