import { useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CSSTransition } from 'react-transition-group'
import { useShallow } from 'zustand/react/shallow'
import type { ChatMode } from '@/entrypoints/content/chat/runtime/types'
import { useChatIframeLoader } from '@/entrypoints/content/chat/runtime/useChatIframeLoader'
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
  const { isDisplay, isIframeLoaded } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      isDisplay: state.isDisplay,
      isIframeLoaded: state.isIframeLoaded,
    })),
  )
  const isChatVisible = isIframeLoaded && (isDisplay || alwaysOnDisplay)
  const { r, g, b, a } = fontColor
  const baseAlpha = a ?? 1
  const grayLuma = Math.round(r * 0.299 + g * 0.587 + b * 0.114)
  const desaturateMix = 0.68
  const loaderColorR = Math.round(r * (1 - desaturateMix) + grayLuma * desaturateMix)
  const loaderColorG = Math.round(g * (1 - desaturateMix) + grayLuma * desaturateMix)
  const loaderColorB = Math.round(b * (1 - desaturateMix) + grayLuma * desaturateMix)
  const loaderColorA = Math.min(0.5, Math.max(0.22, baseAlpha * 0.55))
  const backgroundAlpha = bgColor.a ?? 1
  const overlayAlpha = blur > 0 ? Math.max(backgroundAlpha, 0.01) : backgroundAlpha

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
          className='absolute inset-0 z-20 flex items-center justify-center pointer-events-auto'
          style={{
            backgroundColor: `rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, ${overlayAlpha})`,
            backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
            WebkitBackdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
          }}
        >
          <output className='flex justify-center' aria-label={t('content.aria.loading')}>
            <div
              className='animate-ping h-5 w-5 rounded-full'
              style={{
                backgroundColor: `rgba(${loaderColorR}, ${loaderColorG}, ${loaderColorB}, ${loaderColorA})`,
              }}
            />
          </output>
        </div>
      </CSSTransition>
    </>
  )
}
