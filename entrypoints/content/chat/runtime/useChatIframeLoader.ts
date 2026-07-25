import { useEffect, useRef } from 'react'
import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { type ChatAttachmentController, createChatAttachmentController } from './chatAttachmentController'
import type { ChatMode } from './types'

export type ChatIframeRuntime = {
  videoId: string | null
  mode: ChatMode
  revision: number
}

export const useChatIframeLoader = (runtimeOrMode: ChatIframeRuntime | ChatMode) => {
  const ref = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<ChatAttachmentController | null>(null)
  const runtime =
    typeof runtimeOrMode === 'string' ? { videoId: getCurrentYouTubeVideoId(), mode: runtimeOrMode, revision: 0 } : runtimeOrMode

  useEffect(() => {
    if (!ref.current) return

    const controller = createChatAttachmentController({
      container: ref.current,
      mode: runtime.mode,
    })
    controllerRef.current = controller
    const cleanup = controller.start()

    return () => {
      if (controllerRef.current === controller) controllerRef.current = null
      cleanup()
    }
  }, [runtime.mode, runtime.videoId])

  useEffect(() => {
    controllerRef.current?.reconcile()
  }, [runtime.revision])

  return { ref }
}
