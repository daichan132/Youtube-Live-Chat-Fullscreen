import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import type { ChatMode } from '@/entrypoints/content/chat/runtime/types'
import { useChatIframeLoader } from '@/entrypoints/content/chat/runtime/useChatIframeLoader'
import { CHAT_PANEL_LAYER } from '@/shared/constants/zIndex'
import { useCSSTransition } from '@/shared/hooks/useCSSTransition'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'

const LOADER_TIMEOUT = { enter: 140, exit: 320 } as const
const LOADER_CLASS_NAMES = {
  enter: 'opacity-0 scale-[0.995]',
  enterActive: 'transition-[opacity,transform] opacity-100 scale-100 duration-140 ease-out',
  exit: 'opacity-100 scale-100',
  exitActive: 'transition-[opacity,transform] opacity-0 scale-[1.004] duration-320 ease-[cubic-bezier(0.22,1,0.36,1)]',
} as const
const LOADING_OVERLAY_STYLE = {
  zIndex: CHAT_PANEL_LAYER.interactionOverlay,
} as const
type YTDLiveChatIframeProps = {
  videoId?: string | null
  mode: ChatMode
  runtimeRevision?: number
}

export const YTDLiveChatIframe = ({ videoId = null, mode, runtimeRevision = 0 }: YTDLiveChatIframeProps) => {
  const { t } = useTranslation()
  const id = useId()
  const { ref } = useChatIframeLoader({ videoId, mode, revision: runtimeRevision })
  const { blur, alwaysOnDisplay, bgColor, fontColor } = useYTDLiveChatStore(
    useShallow(state => ({
      blur: state.blur,
      alwaysOnDisplay: state.alwaysOnDisplay,
      bgColor: state.bgColor,
      fontColor: state.fontColor,
    })),
  )
  const { isDisplay, isIframeLoaded } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      isDisplay: state.isDisplay,
      isIframeLoaded: state.isIframeLoaded,
    })),
  )
  const isChatVisible = isIframeLoaded && (isDisplay || alwaysOnDisplay)
  // Firefox/WebRender cannot reliably combine a promoted HDR video surface
  // with a backdrop filter without changing the video's compositing path.
  const backdropFilter = blur > 0 && !import.meta.env.FIREFOX ? `blur(${blur}px)` : 'none'
  const loaderColor = useMemo(() => {
    const { r, g, b, a } = fontColor
    const baseAlpha = a
    const grayLuma = Math.round(r * 0.299 + g * 0.587 + b * 0.114)
    const desaturateMix = 0.68
    return {
      r: Math.round(r * (1 - desaturateMix) + grayLuma * desaturateMix),
      g: Math.round(g * (1 - desaturateMix) + grayLuma * desaturateMix),
      b: Math.round(b * (1 - desaturateMix) + grayLuma * desaturateMix),
      a: Math.min(0.5, Math.max(0.22, baseAlpha * 0.55)),
    }
  }, [fontColor])
  const overlayAlpha = bgColor.a

  const loaderTransition = useCSSTransition({
    in: !isIframeLoaded,
    timeout: LOADER_TIMEOUT,
    classNames: LOADER_CLASS_NAMES,
    unmountOnExit: true,
  })

  return (
    <>
      {/* Persistent background — follows the same visibility gate as the chat surface. */}
      <div
        data-ylc-chat-background
        className='absolute inset-0 rounded-md transition-[background-color,opacity] duration-200 ease-out'
        style={{
          backgroundColor: `rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, ${overlayAlpha})`,
          backdropFilter,
          WebkitBackdropFilter: backdropFilter,
          opacity: isChatVisible ? 1 : 0,
        }}
      />
      <div
        data-ylc-chat-viewport
        className='relative h-full w-full overflow-hidden rounded-md transition-opacity duration-320 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity]'
        style={{
          opacity: isChatVisible ? 1 : 0,
        }}
      >
        <div id={id} ref={ref} data-ylc-iframe-carrier className='absolute inset-0' />
      </div>
      {loaderTransition.isMounted && (
        <div
          data-ylc-loading-overlay
          className={`absolute inset-0 flex items-center justify-center pointer-events-auto ${loaderTransition.className}`}
          style={LOADING_OVERLAY_STYLE}
        >
          <output className='flex justify-center' aria-label={t('content.aria.loading')}>
            <div
              className='animate-ping h-5 w-5 rounded-full'
              style={{
                backgroundColor: `rgba(${loaderColor.r}, ${loaderColor.g}, ${loaderColor.b}, ${loaderColor.a})`,
              }}
            />
          </output>
        </div>
      )}
    </>
  )
}
