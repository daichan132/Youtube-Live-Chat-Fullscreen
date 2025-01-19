import { useRef } from 'react'

import { CSSTransition } from 'react-transition-group'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import { useIframeLoader } from '../hooks/useIframeLoader'

export const YTDLiveChatIframe = () => {
  const { ref } = useIframeLoader()
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

  return (
    <>
      <div
        className='w-full h-full overflow-hidden rounded-md'
        style={{
          opacity: isIframeLoaded && (isDisplay || alwaysOnDisplay) ? 1 : 0,
          backdropFilter: isIframeLoaded ? `blur(${blur}px)` : 'none',
        }}
        id='live-chat-iframe-wrapper'
        ref={ref}
      />
      <CSSTransition
        nodeRef={nodeRef}
        in={!isIframeLoaded}
        timeout={300}
        classNames={{
          appear: 'opacity-0',
          appearActive: 'transition-opacity opacity-100 duration-500',
          enter: 'opacity-0',
          enterActive: 'transition-opacity opacity-100 duration-500',
          exitActive: 'transition-opacity opacity-0 duration-500',
        }}
        delay={150}
        unmountOnExit
      >
        <div
          ref={nodeRef}
          className='w-full h-full absolute top-0 flex justify-center items-center bg-opacity-[rgba(${backgroundColorRef.current.r}, ${backgroundColorRef.current.g}, ${backgroundColorRef.current.b}, ${backgroundColorRef.current.a})] backdrop-blur-${blur} transition-opacity duration-500'
          style={{
            backdropFilter: `blur(${blur}px)`,
            backgroundColor: `rgba(${backgroundColorRef.current.r}, ${backgroundColorRef.current.g}, ${backgroundColorRef.current.b}, ${backgroundColorRef.current.a})`,
          }}
        >
          <div className='flex justify-center' aria-label='loading'>
            <div
              className='animate-ping h-5 w-5 rounded-full'
              style={{
                backgroundColor: `rgba(${fontColorRef.current.r}, ${fontColorRef.current.g}, ${fontColorRef.current.b}, ${fontColorRef.current.a})`,
              }}
            />
          </div>
        </div>
      </CSSTransition>
    </>
  )
}
