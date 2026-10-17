import type { ChatProfile } from '@/shared/settings/model'
import { isRecord } from '@/shared/settings/normalizeSettings'

export const SETTINGS_FRAME_MESSAGE = {
  close: 'ylc-settings-close',
  stylePreview: 'ylc-settings-style-preview',
} as const

export type SettingsFrameRequest =
  | { type: typeof SETTINGS_FRAME_MESSAGE.close }
  | { type: typeof SETTINGS_FRAME_MESSAGE.stylePreview; profile: ChatProfile | null; active: boolean }

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
  return value.type === SETTINGS_FRAME_MESSAGE.close
}
