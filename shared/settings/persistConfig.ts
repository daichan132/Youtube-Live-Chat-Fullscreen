export const SETTINGS_EXPORT_VERSION = 2
export const MAX_SETTINGS_BACKUP_BYTES = 1024 * 1024
export const MAX_CUSTOM_PRESETS = 100
// Version 1 had seven built-ins; its input limit must not change with today's catalog.
export const MAX_LEGACY_PRESET_REFERENCES = MAX_CUSTOM_PRESETS + 7
export const MAX_PRESET_ID_LENGTH = 128
export const MAX_PRESET_NAME_LENGTH = 100
