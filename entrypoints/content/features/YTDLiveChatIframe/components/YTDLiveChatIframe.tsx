import { useId, useRef } from 'react'

import { CSSTransition } from 'react-transition-group'
import { useShallow } from 'zustand/react/shallow'
import type { ChatMode } from '@/entrypoints/content/chat/runtime/types'
import { useChatIframeLoader } from '@/entrypoints/content/chat/runtime/useChatIframeLoader'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'

type YTDLiveChatIframeProps = {
  mode: ChatMode
}

export const YTDLiveChatIframe = ({ mode }: YTDLiveChatIframeProps) => {
  const id = useId()
  const { ref } = useChatIframeLoader(mode)
  const nodeRef = useRef(null)
  const backgroundColorRef = useRef(useYTDLiveChatStore.getState().bgColor)
  const fontColorRef = useRef(useYTDLiveChatStore.getState().fontColor)
  const { blur, alwaysOnDisplay } = useYTDLiveChatStore(
    useShallow(state => ({
      blur: state.blur,
      alwaysOnDisplay: state.alwaysOnDisplay,
    })),
  )
  const { isDisplay, isIframeLoaded } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      isDisplay: state.isDisplay,
      isIframeLoaded: state.isIframeLoaded,
    })),
  )
  const isChatVisible = isIframeLoaded && (isDisplay || alwaysOnDisplay)
  const { r, g, b, a } = fontColorRef.current
  const baseAlpha = a ?? 1
  const grayLuma = Math.round(r * 0.299 + g * 0.587 + b * 0.114)
  const desaturateMix = 0.68
  const loaderColorR = Math.round(r * (1 - desaturateMix) + grayLuma * desaturateMix)
  const loaderColorG = Math.round(g * (1 - desaturateMix) + grayLuma * desaturateMix)
  const loaderColorB = Math.round(b * (1 - desaturateMix) + grayLuma * desaturateMix)
  const loaderColorA = Math.min(0.5, Math.max(0.22, baseAlpha * 0.55))

  return (
    <>
      <div
        className='w-full h-full overflow-hidden rounded-md transition-[opacity,transform,filter] duration-320 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform,filter]'
        style={{
          opacity: isChatVisible ? 1 : 0,
          transform: isChatVisible ? 'translateY(0) scale(1)' : 'translateY(2px) scale(0.996)',
          filter: isChatVisible ? 'blur(0px)' : 'blur(1px)',
        }}
        id={id}
        ref={ref}
      />
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
          className='absolute top-0 z-20 flex h-full w-full items-center justify-center pointer-events-auto'
          style={{
            backdropFilter: `blur(${blur}px)`,
            backgroundColor: `rgba(${backgroundColorRef.current.r}, ${backgroundColorRef.current.g}, ${backgroundColorRef.current.b}, ${backgroundColorRef.current.a})`,
          }}
        >
          <output className='flex justify-center' aria-label='loading'>
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
