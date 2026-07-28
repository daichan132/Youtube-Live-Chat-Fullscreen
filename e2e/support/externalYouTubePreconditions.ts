export type ExternalYouTubePrecondition =
  | 'native-chat-frame'
  | 'native-chat-source'
  | 'fullscreen-ui'
  | 'chat-close-ui'
  | 'video-navigation-ui'

/**
 * Converts failures from YouTube-owned state into a canary skip decision.
 * Extension-owned switch, overlay, iframe, borrow, and cleanup assertions must
 * never pass through this boundary.
 */
export const meetsExternalYouTubePrecondition = async (
  _precondition: ExternalYouTubePrecondition,
  assertion: () => Promise<void>,
): Promise<boolean> => {
  try {
    await assertion()
    return true
  } catch {
    return false
  }
}
