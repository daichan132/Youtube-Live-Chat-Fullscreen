import { errors } from '@playwright/test'

export type ExternalYouTubePrecondition =
  | 'watch-player'
  | 'search-results'
  | 'native-chat-frame'
  | 'native-chat-source'
  | 'fullscreen-ui'
  | 'chat-close-ui'
  | 'video-navigation-ui'

/**
 * Converts timed-out waits for YouTube-owned state into a canary skip decision.
 * Extension-owned switch, overlay, iframe, borrow, and cleanup assertions must
 * never pass through this boundary. Unexpected test or browser errors still fail.
 */
export const meetsExternalYouTubePrecondition = async (
  _precondition: ExternalYouTubePrecondition,
  assertion: () => Promise<void>,
): Promise<boolean> => {
  try {
    await assertion()
    return true
  } catch (error) {
    if (error instanceof errors.TimeoutError) return false
    throw error
  }
}
