import { useCallback } from 'react'
import { type Clip, measureClipFromBody } from './clipGeometry'

interface ClipPathManagementProps {
  iframeElement: HTMLIFrameElement | null
}

/**
 * Hook that manages clip path functionality for the YouTube chat
 * Handles DOM-dependent clip measurement and focus cleanup.
 */
export const useClipPathManagement = ({ iframeElement }: ClipPathManagementProps) => {
  /**
   * Gets the current clip dimensions from the iframe content
   * Note: We only depend on iframeElement, not its internal properties.
   */
  const getClip = useCallback((): Clip => measureClipFromBody(iframeElement?.contentDocument?.body), [iframeElement])

  /**
   * Removes focus from any active elements in the iframe
   */
  const removeFocus = useCallback(() => {
    const activeElement = iframeElement?.contentDocument?.activeElement
    if (activeElement instanceof HTMLElement) {
      activeElement.blur()
    }
  }, [iframeElement])

  return {
    getClip,
    removeFocus,
  }
}
