export const SETTINGS_FRAME_MESSAGE = {
  close: 'ylc-settings-close',
} as const

export type SettingsFrameMessage = {
  type: (typeof SETTINGS_FRAME_MESSAGE)[keyof typeof SETTINGS_FRAME_MESSAGE]
}

export const isSettingsFrameMessage = (value: unknown): value is SettingsFrameMessage => {
  if (typeof value !== 'object' || value === null) return false
  return Object.values(SETTINGS_FRAME_MESSAGE).includes((value as SettingsFrameMessage).type)
}
