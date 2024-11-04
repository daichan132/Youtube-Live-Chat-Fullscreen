import { useRef } from 'react'

import { CSSTransition } from 'react-transition-group'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatNoLsStore } from '@/stores'
import { Draggable } from '../components/Draggable/Draggable'
import { DisplayEffect } from '../components/EffectComponent/DisplayEffect'
import { WindowResizeEffect } from '../components/EffectComponent/WindowResizeEffect'
import { YTDLiveChatIframe } from '../components/YTDLiveChatIframe/YTDLiveChatIframe'
import { YTDLiveChatSetting } from '../components/YTDLiveChatSetting/YTDLiveChatSetting'
import { useIsShow } from '../hooks/useIsShow'
import fade from '../styles/Fade.module.css'

export const YTDLiveChat = () => {
  const { isFullscreen, isShow } = useIsShow()
  const nodeRef = useRef(null)
  const { setIsHover } = useYTDLiveChatNoLsStore(
    useShallow(state => ({ setIsHover: state.setIsHover })),
  )
  return (
    isFullscreen && (
      <>
        <CSSTransition nodeRef={nodeRef} in={isShow} timeout={500} classNames={fade} unmountOnExit>
          <div
            ref={nodeRef}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
            style={{ position: 'relative', zIndex: '1000000' }}
          >
            <DisplayEffect />
            <WindowResizeEffect />
            <Draggable>
              <YTDLiveChatIframe />
            </Draggable>
          </div>
        </CSSTransition>
        <YTDLiveChatSetting />
      </>
    )
  )
}
