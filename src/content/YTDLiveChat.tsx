import { useRef } from 'react'

import { CSSTransition } from 'react-transition-group'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatNoLsStore } from '@/stores'
import fade from './Fade.module.css'
import { Draggable } from './features/Draggable'
import { YTDLiveChatIframe } from './features/YTDLiveChatIframe'
import { YTDLiveChatSetting } from './features/YTDLiveChatSetting'
import { useIsShow } from './hooks/useIsShow'

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
          >
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
