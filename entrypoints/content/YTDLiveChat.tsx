import { useRef } from 'react'

import { CSSTransition } from 'react-transition-group'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatNoLsStore } from '@/shared/stores'
import { Draggable } from './features/Draggable'
import { YTDLiveChatIframe } from './features/YTDLiveChatIframe'
import { YTDLiveChatSetting } from './features/YTDLiveChatSetting'
import { useIsShow } from './hooks/watchYouTubeUI/useIsShow'

export const YTDLiveChat = () => {
  const isShow = useIsShow()
  const nodeRef = useRef(null)
  const { setIsHover } = useYTDLiveChatNoLsStore(useShallow(state => ({ setIsHover: state.setIsHover })))

  return (
    <>
      <YTDLiveChatSetting />
      <CSSTransition
        nodeRef={nodeRef}
        in={isShow}
        timeout={500}
        classNames={{
          enter: 'opacity-0',
          enterActive: 'opacity-100 transition-opacity duration-500',
          exit: 'opacity-100',
          exitActive: 'opacity-0 transition-opacity duration-500',
        }}
        unmountOnExit
      >
        <div ref={nodeRef} onMouseEnter={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)}>
          <Draggable>
            <YTDLiveChatIframe />
          </Draggable>
        </div>
      </CSSTransition>
    </>
  )
}
