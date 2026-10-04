import type { ChatProfile } from '@/shared/settings/model'
import { isRecord } from '@/shared/settings/normalizeSettings'
import type { SanitizedDiagnosticReport } from '../diagnostics/sanitizeDiagnosticReport'

export const SETTINGS_FRAME_MESSAGE = {
  close: 'ylc-settings-close',
  diagnosticsRequest: 'ylc-settings-diagnostics-request',
  diagnosticsReport: 'ylc-settings-diagnostics-report',
  runtimeRestart: 'ylc-settings-runtime-restart',
  stylePreview: 'ylc-settings-style-preview',
} as const

export type SettingsFrameRequest =
  | { type: typeof SETTINGS_FRAME_MESSAGE.close }
  | { type: typeof SETTINGS_FRAME_MESSAGE.diagnosticsRequest }
  | { type: typeof SETTINGS_FRAME_MESSAGE.runtimeRestart }
  | { type: typeof SETTINGS_FRAME_MESSAGE.stylePreview; profile: ChatProfile | null; active: boolean }

export type SettingsFrameReport = {
  type: typeof SETTINGS_FRAME_MESSAGE.diagnosticsReport
  report: SanitizedDiagnosticReport
}

const hasType = (value: unknown): value is { type: unknown } => typeof value === 'object' && value !== null && 'type' in value

export const isSettingsFrameRequest = (value: unknown): value is SettingsFrameRequest => {
  if (!hasType(value)) return false
  if (value.type === SETTINGS_FRAME_MESSAGE.stylePreview) {
    return (
      'active' in value &&
      typeof value.active === 'boolean' &&
      'profile' in value &&
      (value.profile === null || (isRecord(value.profile) && isRecord(value.profile.appearance) && isRecord(value.profile.display)))
    )
  }
  return (
    value.type === SETTINGS_FRAME_MESSAGE.close ||
    value.type === SETTINGS_FRAME_MESSAGE.diagnosticsRequest ||
    value.type === SETTINGS_FRAME_MESSAGE.runtimeRestart
  )
}

export const isSettingsFrameReport = (value: unknown): value is SettingsFrameReport => {
  if (!hasType(value) || value.type !== SETTINGS_FRAME_MESSAGE.diagnosticsReport || !('report' in value)) return false
  const report = value.report
  return typeof report === 'object' && report !== null && 'schemaVersion' in report && report.schemaVersion === 1
}
