import { useCallback } from 'react'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'

interface ClipPathSizeAdjustment {
  setCoordinates: (coordinates: { x: number; y: number }) => void
  setSize: (size: { width: number; height: number }) => void
  iframeElement: HTMLIFrameElement | null
}

interface Clip {
  header: number
  input: number
}

/**
 * Hook that manages clip path functionality for the YouTube chat
 * Handles size and position adjustments when entering/exiting clip path mode
 */
export const useClipPathManagement = ({ setCoordinates, setSize, iframeElement }: ClipPathSizeAdjustment) => {
  /**
   * Adjusts the position and size of the container when clip path state changes
   */
  const handleClipPathChange = useCallback(
    (isClipPath: boolean) => {
      const { size, coordinates } = useYTDLiveChatStore.getState()
      const { clip } = useYTDLiveChatNoLsStore.getState()
      const topClip = clip.header
      const bottomClip = clip.input

      if (isClipPath) {
        // When enabling clip path, move up by header height and increase total height
        setCoordinates({ x: coordinates.x, y: coordinates.y - topClip })
        setSize({
          width: size.width,
          height: size.height + (topClip + bottomClip),
        })
      } else {
        // When disabling clip path, move down by header height and decrease total height
        setCoordinates({ x: coordinates.x, y: coordinates.y + topClip })
        setSize({
          width: size.width,
          height: size.height - (topClip + bottomClip),
        })
      }
    },
    [setCoordinates, setSize],
  )

  /**
   * Gets the current clip dimensions from the iframe content
   * Note: We only depend on iframeElement, not its internal properties,
   * since body/activeElement are live references that change frequently
   */
  const getClip = useCallback((): Clip => {
    const body = iframeElement?.contentDocument?.body

    // Calculate header height (subtract 8px for padding/margin adjustments)
    const header = (body?.querySelector('yt-live-chat-header-renderer')?.clientHeight || 0) - 8

    // Calculate input area height (subtract 4px for adjustments)
    const input =
      (body?.querySelector('yt-live-chat-message-input-renderer')?.clientHeight ||
        body?.querySelector('yt-live-chat-restricted-participation-renderer')?.clientHeight ||
        0) - 4

    return { header, input }
  }, [iframeElement])

  /**
   * Removes focus from any active elements in the iframe
   */
  const removeFocus = useCallback(() => {
    ;(iframeElement?.contentDocument?.activeElement as HTMLElement)?.blur()
  }, [iframeElement])

  return {
    handleClipPathChange,
    getClip,
    removeFocus,
  }
}
