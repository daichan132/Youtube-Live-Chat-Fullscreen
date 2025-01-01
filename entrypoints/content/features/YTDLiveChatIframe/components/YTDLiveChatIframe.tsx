import { useRef } from 'react'

import { CSSTransition } from 'react-transition-group'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import { useIframeLoader } from '../hooks/useIframeLoader'
import styles from '../styles/Loader.module.css'

export const YTDLiveChatIframe = () => {
  const { ref } = useIframeLoader()
  const nodeRef = useRef(null)
  const backgroundColorRef = useRef(useYTDLiveChatStore.getState().bgColor)
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
        style={{
          opacity: isIframeLoaded && (isDisplay || alwaysOnDisplay) ? 1 : 0,
          backdropFilter: isIframeLoaded ? `blur(${blur}px)` : 'none',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: '10px',
        }}
        id='live-chat-iframe-wrapper'
        ref={ref}
      />
      <CSSTransition
        nodeRef={nodeRef}
        in={!isIframeLoaded}
        timeout={300}
        classNames={{
          enter: 'opacity-0',
          enterActive: 'opacity-100 transition-opacity duration-500',
          exit: 'opacity-100',
          exitActive: 'opacity-0 transition-opacity duration-500',
        }}
        delay={300}
        unmountOnExit
      >
        <div
          ref={nodeRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            backdropFilter: `blur(${blur}px)`,
            backgroundColor: `rgba(${backgroundColorRef.current.r}, ${backgroundColorRef.current.g}, ${backgroundColorRef.current.b}, ${backgroundColorRef.current.a})`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div className={styles.loader} />
        </div>
      </CSSTransition>
    </>
  )
}
