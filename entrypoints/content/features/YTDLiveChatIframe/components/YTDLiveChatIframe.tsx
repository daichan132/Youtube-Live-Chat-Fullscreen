import { useId, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CSSTransition } from 'react-transition-group'
import { useShallow } from 'zustand/react/shallow'
import type { ChatMode } from '@/entrypoints/content/chat/runtime/types'
import { useChatIframeLoader } from '@/entrypoints/content/chat/runtime/useChatIframeLoader'
import { CLIP_GEOMETRY_TRANSITION } from '@/entrypoints/content/features/Draggable/constants/animation'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'

type YTDLiveChatIframeProps = {
  mode: ChatMode
}

export const YTDLiveChatIframe = ({ mode }: YTDLiveChatIframeProps) => {
  const { t } = useTranslation()
  const id = useId()
  const { ref } = useChatIframeLoader(mode)
  const nodeRef = useRef(null)
  const { blur, alwaysOnDisplay, bgColor, fontColor } = useYTDLiveChatStore(
    useShallow(state => ({
      blur: state.blur,
      alwaysOnDisplay: state.alwaysOnDisplay,
      bgColor: state.bgColor,
      fontColor: state.fontColor,
    })),
  )
  const { isDisplay, isIframeLoaded, clip, isClipPath } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      isDisplay: state.isDisplay,
      isIframeLoaded: state.isIframeLoaded,
      clip: state.clip,
      isClipPath: state.isClipPath,
    })),
  )
  const isChatVisible = isIframeLoaded && (isDisplay || alwaysOnDisplay)
  const loaderColor = useMemo(() => {
    const { r, g, b, a } = fontColor
    const baseAlpha = a ?? 1
    const grayLuma = Math.round(r * 0.299 + g * 0.587 + b * 0.114)
    const desaturateMix = 0.68
    return {
      r: Math.round(r * (1 - desaturateMix) + grayLuma * desaturateMix),
      g: Math.round(g * (1 - desaturateMix) + grayLuma * desaturateMix),
      b: Math.round(b * (1 - desaturateMix) + grayLuma * desaturateMix),
      a: Math.min(0.5, Math.max(0.22, baseAlpha * 0.55)),
    }
  }, [fontColor])
  const overlayAlpha = bgColor.a ?? 1

  return (
    <>
      <div
        className='relative h-full w-full transition-opacity duration-320 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity]'
        style={{
          opacity: isChatVisible ? 1 : 0,
        }}
      >
        <div
          id={id}
          ref={ref}
          className='h-full w-full overflow-hidden rounded-md transition-[background-color] duration-200 ease-out'
          style={{
            backgroundColor: `rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, ${overlayAlpha})`,
          }}
        />
      </div>
      <CSSTransition
        nodeRef={nodeRef}
        in={!isIframeLoaded}
        timeout={{ appear: 140, enter: 140, exit: 320 }}
        classNames={{
          appear: 'opacity-0 scale-[0.995]',
          appearActive: 'transition-[opacity,transform] opacity-100 scale-100 duration-140 ease-out',
          enter: 'opacity-0 scale-[0.995]',
          enterActive: 'transition-[opacity,transform] opacity-100 scale-100 duration-140 ease-out',
          exit: 'opacity-100 scale-100',
          exitActive: 'transition-[opacity,transform] opacity-0 scale-[1.004] duration-320 ease-[cubic-bezier(0.22,1,0.36,1)]',
        }}
        delay={70}
        unmountOnExit
      >
        <div
          ref={nodeRef}
          className='absolute left-0 right-0 z-20 flex items-center justify-center pointer-events-auto'
          style={{
            top: isClipPath ? `${clip.header}px` : 0,
            bottom: isClipPath ? `${clip.input}px` : 0,
            transition: `top ${CLIP_GEOMETRY_TRANSITION}, bottom ${CLIP_GEOMETRY_TRANSITION}`,
            backgroundColor: `rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, ${overlayAlpha})`,
            backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
            WebkitBackdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
          }}
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
      </CSSTransition>
    </>
  )
}
