export const FIXTURE_PROJECT_NAME = 'fixture'
export const CANARY_PROJECT_NAME = 'canary'
export const VISUAL_PROJECT_NAME = 'visual'
export const ACCESSIBILITY_PROJECT_NAME = 'accessibility'
export const STORE_ASSETS_PROJECT_NAME = 'store-assets'

export const DETERMINISTIC_PROJECT_NAMES = [
  FIXTURE_PROJECT_NAME,
  VISUAL_PROJECT_NAME,
  ACCESSIBILITY_PROJECT_NAME,
] as const

/**
 * Playwright scenarios are classified explicitly so adding a spec cannot
 * silently place a real-YouTube test in the pull-request gate.
 *
 * Paths are relative to e2e/scenarios.
 */
export const FIXTURE_SPECS = [
  'archive/borrowRestore.fixture.spec.ts',
  'archive/replayUnavailable.fixture.spec.ts',
  'live/managedNativeHandoff.fixture.spec.ts',
  'live/noChatVideo.fixture.spec.ts',
  'popup/popup.spec.ts',
] as const

export const CANARY_SPECS = [
  'archive/chatOnlyHoverHeight.spec.ts',
  'archive/fullscreenChatRestore.spec.ts',
  'archive/fullscreenChatVideoTransition.spec.ts',
  'archive/liveChatReplay.spec.ts',
  'archive/replayUnavailable.spec.ts',
  'live/chatModeStability.spec.ts',
  'live/chatOnlyHoverHeight.spec.ts',
  'live/chatStyleSettings.spec.ts',
  'live/fullscreenChatAutoOpen.spec.ts',
  'live/fullscreenChatDoesNotBlockClicks.spec.ts',
  'live/fullscreenChatOffset.spec.ts',
  'live/importedSettingsFullscreen.spec.ts',
  'live/nativeChatClosedExtensionLoads.spec.ts',
  'live/noChatVideo.spec.ts',
  'live/settingPanelIconScale.spec.ts',
  'live/styleIsolation.spec.ts',
] as const

export const toPlaywrightTestMatch = (specs: readonly string[]) => specs.map(spec => `**/${spec}`)
