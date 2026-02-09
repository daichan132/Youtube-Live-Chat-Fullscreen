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

  return (
    <>
      <div
        className='w-full h-full overflow-hidden rounded-md'
        style={{
          opacity: isIframeLoaded && (isDisplay || alwaysOnDisplay) ? 1 : 0,
        }}
        id={id}
        ref={ref}
      />
      <CSSTransition
        nodeRef={nodeRef}
        in={!isIframeLoaded}
        timeout={300}
        classNames={{
          appear: 'opacity-0',
          appearActive: 'transition-opacity opacity-100 duration-200',
          enter: 'opacity-0',
          enterActive: 'transition-opacity opacity-100 duration-200',
          exitActive: 'transition-opacity opacity-0 duration-200',
        }}
        delay={150}
        unmountOnExit
      >
        <div
          ref={nodeRef}
          className='absolute top-0 flex h-full w-full items-center justify-center transition-opacity duration-500'
          style={{
            backdropFilter: `blur(${blur}px)`,
            backgroundColor: `rgba(${backgroundColorRef.current.r}, ${backgroundColorRef.current.g}, ${backgroundColorRef.current.b}, ${backgroundColorRef.current.a})`,
          }}
        >
          <output className='flex justify-center' aria-label='loading'>
            <div
              className='animate-ping h-5 w-5 rounded-full'
              style={{
                backgroundColor: `rgba(${fontColorRef.current.r}, ${fontColorRef.current.g}, ${fontColorRef.current.b}, ${fontColorRef.current.a})`,
              }}
            />
          </output>
        </div>
      </CSSTransition>
    </>
  )
}
