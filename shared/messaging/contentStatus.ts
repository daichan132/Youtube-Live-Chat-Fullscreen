import type { SanitizedDiagnosticReport } from '@/entrypoints/content/diagnostics/sanitizeDiagnosticReport'

export type ContentStatusRequest = { type: 'ylc:status' } | { type: 'ylc:retry'; token: string }
export type ContentStatusResponse = {
  status: 'unsupported' | 'starting' | 'failed' | 'running'
  token: string
  report?: SanitizedDiagnosticReport
  retry?: 'accepted' | 'stale'
}

export const isContentStatusRequest = (value: unknown): value is ContentStatusRequest => {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return (
    (data.type === 'ylc:status' && Object.keys(data).length === 1) ||
    (data.type === 'ylc:retry' && typeof data.token === 'string' && data.token.length <= 100 && Object.keys(data).length === 2)
  )
}
