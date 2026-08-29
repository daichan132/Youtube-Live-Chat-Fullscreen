export const ENABLED_STORAGE_KEY = 'ylc-enabled' as const
export const THEME_STORAGE_KEY = 'ylc-theme' as const
export const APPEARANCE_STORAGE_KEY = 'ylc-chat-appearance' as const
export const GEOMETRY_STORAGE_KEY = 'ylc-chat-geometry' as const
export const LOCALE_STORAGE_KEY = 'ylc-locale' as const

// Read-only compatibility keys. New writes never target these entries.
export const LEGACY_GLOBAL_STORAGE_KEY = 'ylc-global-settings' as const
export const LEGACY_CHAT_STORAGE_KEY = 'ylc-chat-settings' as const

/** @deprecated Read-only compatibility alias for pre-domain storage tests and fixtures. */
export const GLOBAL_STORAGE_KEY = LEGACY_GLOBAL_STORAGE_KEY
/** @deprecated Read-only compatibility alias for pre-domain storage tests and fixtures. */
export const CHAT_STORAGE_KEY = LEGACY_CHAT_STORAGE_KEY
