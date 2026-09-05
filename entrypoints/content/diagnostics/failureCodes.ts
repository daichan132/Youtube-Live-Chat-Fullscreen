export const RUNTIME_FAILURE_CODES = [
  'PLAYER_TARGET_MISSING',
  'CONTROL_TARGET_MISSING',
  'CHAT_SOURCE_PENDING',
  'CHAT_SOURCE_UNAVAILABLE',
  'BORROWED_IFRAME_DETACHED',
  'IFRAME_DOCUMENT_NOT_READY',
  'RESTORE_TARGET_MISSING',
  'PRESENTATION_TARGET_REPLACED',
  'RETRY_EXHAUSTED',
  'UNEXPECTED_RUNTIME_ERROR',
] as const

export type RuntimeFailureCode = (typeof RUNTIME_FAILURE_CODES)[number]

// Fixed operation names only. Never derive these values from exception text,
// DOM content, video identifiers or URLs.
export const RUNTIME_FAILURE_STAGES = [
  'observe-page',
  'session-lifecycle',
  'resolve-decision',
  'apply-resources',
  'publish-view',
] as const

export type RuntimeFailureStage = (typeof RUNTIME_FAILURE_STAGES)[number]
